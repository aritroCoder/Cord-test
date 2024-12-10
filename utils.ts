import * as Cord from "@cord.network/sdk"
import { setTimeout } from "timers/promises"
import { SDKErrors, DecoderUtils } from "@cord.network/utils"

import {
    EntryUri,
    Option,
    IRegistryEntryChainStorage,
    DidUri,
    RegistryUri,
} from "@cord.network/types"

import type { PalletEntriesRegistryEntryDetails } from "@cord.network/augment-api"
import { encodeAddress } from "@polkadot/util-crypto"

import { ConfigService } from "@cord.network/config"

import {
    uriToIdentifier,
    uriToEntryIdAndDigest,
    identifierToUri,
} from "@cord.network/identifier"

/**
 * `createAccount` creates a new account from a mnemonic
 * @param mnemonic - The mnemonic phrase to use to generate the account. If not provided, a new
 * mnemonic will be generated.
 * @returns An object with two properties: account and mnemonic.
 */
export function createAccount(mnemonic = Cord.Utils.Crypto.mnemonicGenerate(24)): {
    account: Cord.CordKeyringPair
    mnemonic: string
} {
    const keyring = new Cord.Utils.Keyring({
        ss58Format: 29,
        type: "ed25519",
    })
    return {
        account: keyring.addFromMnemonic(mnemonic) as Cord.CordKeyringPair,
        mnemonic,
    }
}

export async function getBalance(address: string, api) {
    Cord.ConfigService.set({ submitTxResolveOn: Cord.Chain.IS_IN_BLOCK })

    const { data: balance } = await api.query.system.account(address)
    return balance.free.toString() // Returns free balance as a string
}

/**
 * It tries to submit a transaction, and if it fails, it waits a bit and tries again
 * @param tx - The transaction to submit.
 * @param submitter - The account that will be used to sign the transaction.
 */
export async function failproofSubmit(
    tx: Cord.SubmittableExtrinsic,
    submitter: Cord.KeyringPair
) {
    try {
        await Cord.Chain.signAndSubmitTx(tx, submitter)
    } catch {
        // Try a second time after a small delay and fetching the right nonce.
        const waitingTime = 6_000 // 6 seconds
        console.log(
            `First submission failed. Waiting ${waitingTime} ms before retrying.`
        )
        await setTimeout(waitingTime)
        console.log("Retrying...")
        // nonce: -1 tells the client to fetch the latest nonce by also checking the tx pool.
        const resignedBatchTx = await tx.signAsync(submitter, { nonce: -1 })
        await Cord.Chain.submitSignedTx(resignedBatchTx)
    }
}

/**
 * It adds an authority to the list of authorities that can submit extrinsics to the chain
 * @param authorAccount - The account that will be used to sign the transaction.
 * @param authority - The address of the authority to add.
 */
export async function addNetworkMember(
    authorAccount: Cord.KeyringPair,
    authority: Cord.CordAddress
) {
    const api = Cord.ConfigService.get("api")

    const callTx = api.tx.networkMembership.nominate(authority, false)

    const sudoTx = await api.tx.sudo.sudo(callTx)

    await failproofSubmit(sudoTx, authorAccount)
}

/**
 * Decodes the registry entry details from the blockchain state.
 * This function takes an optional encoded entry and an identifier,
 * then extracts and formats the relevant properties into a structured object.
 *
 * @param {Option<PalletEntriesRegistryEntryDetails>} encoded - 
 * The optional encoded data from the blockchain representing the registry entry details. 
 * It may contain the entry details or be `None`.
 * 
 * @param {string} identifier - 
 * The identifier used to generate the URI for the registry entry.
 *
 * @returns {IRegistryEntryChainStorage | null} 
 * - Returns an object containing the decoded registry entry details structured as `IRegistryEntryChainStorage`.
 * - If the encoded data is `None`, returns `null`.
 * 
 * @example
 * // Example Usage:
 * const encodedEntryDetails = ... // fetched from the blockchain
 * const identifier = "someIdentifier";
 * 
 * const registryEntry = decodeRegistryEntryDetailsFromChain(encodedEntryDetails, identifier);
 * console.log(registryEntry); // Outputs the decoded registry entry details.
 *
 */
export function decodeRegistryEntryDetailsFromChain(
  encoded: Option<PalletEntriesRegistryEntryDetails>,
  identifier: string
): IRegistryEntryChainStorage | null {
  if (encoded.isNone) {
    return null; 
  }

  const chainRegistryEntry = encoded.unwrap(); 

  /* 
   * Below code block encodes the data from the chain present in raw
   * to its respective formats.
   */
  const registryEntry: IRegistryEntryChainStorage = {
    uri: identifierToUri(identifier) as EntryUri,
    digest: chainRegistryEntry.digest.toHex(),
    revoked: chainRegistryEntry.revoked.valueOf(),
    creatorUri: `did:cord:3${encodeAddress(chainRegistryEntry.creator, 29)}` as DidUri,
    registryUri: identifierToUri(
      DecoderUtils.hexToString(chainRegistryEntry.registryId.toString())
    ) as RegistryUri
  };

  console.log("chainRegistryEntry after", registryEntry);

  return registryEntry;
}

/**
 * Retrieves the details of a registry entry from the blockchain using the provided identifier.
 * This asynchronous function queries the blockchain for the registry entry associated with
 * the specified identifier and decodes the details into a structured format.
 *
 * @param {string} identifier - 
 * The identifier used to query the registry entry from the blockchain.
 *
 * @returns {Promise<IRegistryEntryChainStorage | null>} 
 * - Returns a promise that resolves to an object containing the decoded registry entry details
 * structured as `IRegistryEntryChainStorage`.
 * - If no entry is found, it throws an error.
 * 
 * @throws {SDKErrors.CordFetchError} 
 * Throws an error if there is no registry entry associated with the provided identifier.
 * 
 * @example
 * // Example Usage:
 * const identifier = "someIdentifier";
 * 
 * try {
 *   const entryDetails = await getDetailsfromChain(identifier);
 *   console.log(entryDetails); // Outputs the registry entry details.
 * } catch (error) {
 *   console.error(error.message); // Handle the error accordingly.
 * }
 * 
 */
export async function getDetailsfromChain(
  identifier: string
): Promise<IRegistryEntryChainStorage | null> {
  const api = ConfigService.get('api');
  const registryEntryId = uriToIdentifier(identifier);

  const registryEntry = await api.query.entries.registryEntries(registryEntryId);

  const decodedDetails = decodeRegistryEntryDetailsFromChain(registryEntry, identifier);

  if (!decodedDetails) {
    throw new SDKErrors.CordFetchError(
      `There is no registry entry with the provided ID "${registryEntryId}" present on the chain.`
    );
  }

  return decodedDetails;
}

/**
 * Fetches the registry entry details from the blockchain using the specified entry URI.
 * This asynchronous function converts the entry URI into its corresponding identifier,
 * retrieves the details of the registry entry from the blockchain, and returns them in a
 * structured format.
 *
 * @param {EntryUri} registryEntryUri - 
 * The URI of the registry entry for which details are to be fetched.
 *
 * @returns {Promise<IRegistryEntryChainStorage>} 
 * - Returns a promise that resolves to an object containing the decoded registry entry details
 * structured as `IRegistryEntryChainStorage`.
 * 
 * @throws {SDKErrors.CordFetchError} 
 * Throws an error if no registry entry is found associated with the provided URI.
 * 
 * @example
 * // Example Usage:
 * const registryEntryUri = "someEntryUri";
 * 
 * try {
 *   const entryDetails = await fetchRegistryEntryDetailsFromChain(registryEntryUri);
 *   console.log(entryDetails); // Outputs the registry entry details.
 * } catch (error) {
 *   console.error(error.message); // Handle the error accordingly.
 * }
 * 
 */
export async function fetchRegistryEntryDetailsFromChain(
  registryEntryUri: EntryUri
): Promise<IRegistryEntryChainStorage> {
  const registryEntryObj = uriToEntryIdAndDigest(registryEntryUri);

  const entryDetails = await getDetailsfromChain(registryEntryObj.identifier);

  if (!entryDetails) {
    throw new SDKErrors.CordFetchError(
      `There is no registry entry with the provided ID "${registryEntryObj.identifier}" present on the chain.`
    );
  }

  return entryDetails;
}