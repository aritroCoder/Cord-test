import * as Cord from "@cord.network/sdk"
import { setTimeout } from "timers/promises"
import { BN } from "bn.js"

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
