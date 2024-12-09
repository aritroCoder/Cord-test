import * as Cord from "@cord.network/sdk"
import { BN } from "bn.js"

/**
 * `createAccount` creates a new account from a mnemonic
 * @param mnemonic - The mnemonic phrase to use to generate the account. If not provided, a new
 * mnemonic will be generated.
 * @returns An object with two properties: account and mnemonic.
 */
function createAccount(mnemonic = Cord.Utils.Crypto.mnemonicGenerate(24)): {
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

async function getBalance(address: string, api) {
    Cord.ConfigService.set({ submitTxResolveOn: Cord.Chain.IS_IN_BLOCK })

    const { data: balance } = await api.query.system.account(address)
    return balance.free.toString() // Returns free balance as a string
}

async function main() {
    const networkAddress = process.env.NETWORK_ADDRESS
        ? process.env.NETWORK_ADDRESS
        : "ws://127.0.0.1:9944"

    Cord.ConfigService.set({ submitTxResolveOn: Cord.Chain.IS_IN_BLOCK })
    await Cord.connect(networkAddress)

    const api = Cord.ConfigService.get("api")

    // Step 1: Setup Membership
    // Setup transaction author account - CORD Account.
    console.log(`\n❄️  New Network Member`)
    const authorityAuthorIdentity = Cord.Utils.Crypto.makeKeypairFromUri(
        process.env.ANCHOR_URI ? process.env.ANCHOR_URI : "//Alice",
        "sr25519"
    )

    // Setup network member account.
    const { account: authorIdentity } = await createAccount()
    console.log(
        `🏦  Member (${authorIdentity.type}): ${authorIdentity.address}`
    )

    console.log("========================= Before txn")

    console.log(
        `💰  Member (${
            authorityAuthorIdentity.type
        }) balance: ${await getBalance(authorityAuthorIdentity.address, api)}`
    )

    console.log(
        `Member (${authorIdentity.type}) balance: ${await getBalance(
            authorIdentity.address,
            api
        )}`
    )

    let tx = await api.tx.balances.transferAllowDeath(
        authorIdentity.address,
        new BN("1000000000000000")
    )
    await Cord.Chain.signAndSubmitTx(tx, authorityAuthorIdentity)

    console.log("========================= After txn")

    console.log(
        `💰  Member (${
            authorityAuthorIdentity.type
        }) balance: ${await getBalance(authorityAuthorIdentity.address, api)}`
    )

    console.log(
        `Member (${authorIdentity.type}) balance: ${await getBalance(
            authorIdentity.address,
            api
        )}`
    )

    // Create a Registry.
    const blob = {
        name: "Companies Registry",
        description:
            "A centralized registry that tracks the registration, incorporation status, and key business details of companies across various industries.",
        metadata: {
            category: "business",
            totalCompaniesRegistered: 15000,
            industriesCovered: [
                "Technology",
                "Healthcare",
                "Renewable Energy",
                "Finance",
                "Manufacturing",
            ],
            lastUpdated: "01-10-2024",
            regulatoryAuthority: "National Business Bureau",
            registrationRequirements: {
                documentsNeeded: [
                    "Incorporation Certificate",
                    "Tax Identification Number",
                    "Proof of Address",
                    "Board Resolution",
                ],
                feeStructure: {
                    smallBusiness: "INR500",
                    mediumBusiness: "INR1000",
                    largeBusiness: "INR5000",
                },
            },
        },
    }
    const stringified_blob = JSON.stringify(blob)
    const digest = await Cord.Registries.getDigestFromRawData(stringified_blob)

    // Crreate a Registry Property.
    const registryDetails = await Cord.Registries.registryCreateProperties(
        authorIdentity.address,
        digest, //digest
        null,
        stringified_blob //blob
    )

    console.log(`\n❄️  Registry Create Details `, registryDetails)

    // Dispatch the Registry Property to the chain.
    const registry = await Cord.Registries.dispatchCreateRegistryToChain(
        registryDetails,
        authorIdentity
    )

    console.log("\n✅ Registry created!")
}

main()
    .then(() => console.log("\nBye! 👋 👋 👋 "))
    .finally(Cord.disconnect)
