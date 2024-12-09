import * as Cord from "@cord.network/sdk"
import { BN } from "bn.js"
import { createAccount, getBalance, addNetworkMember } from "./utils"


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
    const { account: authorIdentity } = createAccount()
    await addNetworkMember(authorityAuthorIdentity, authorIdentity.address)
    console.log(
        `🏦  Member (${authorIdentity.type}): ${authorIdentity.address}`
    )

    // Step 2: Transfer funds to the new account.
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

    // Step 3: Create a Registry.
    const blob = {
        name: "Army Blockchain Journal System",
        description:
            "A blockchain-based system to digitize daily records for the army with emphasis on availability, reliability, safety, and security. The system leverages blockchain to ensure immutability, transparency, and auditability of records while maintaining a robust permissioned access structure for secure data management.",
        metadata: {
            purpose: [
                "Immutability of records",
                "Transparency of operations",
                "Auditability of events",
                "Secure and permissioned data management",
            ],
            features: {
                journalEntries: {
                    fields: [
                        "Date-time",
                        "Name of person entering",
                        "Event Category",
                        "Position/rank of person entering",
                        "Unit name",
                        "Location",
                        "Message",
                        "Optional attachments (photos/files)",
                        "Verified (by journal in-charge)",
                        "Social Media links",
                    ],
                },
                optionalAttachments:
                    "These are additional files that can be attached with a journal entry, such as photographic evidence, scene videos, or other media.",
            },
            technology: {
                blockchain: {
                    advantages: [
                        "Immutability",
                        "Transparency",
                        "Auditability",
                        "Permissioned access structure",
                    ],
                },
            },
        },
    }

    const stringified_blob = JSON.stringify(blob)
    const digest = await Cord.Registries.getDigestFromRawData(stringified_blob)

    /// Crreate a Registry Property.
    const registryDetails = await Cord.Registries.registryCreateProperties(
        authorIdentity.address,
        digest, //digest
        null,
        stringified_blob //blob
    )

    console.log(`\n❄️  Registry Create Details `, registryDetails)

    /// Dispatch the Registry Property to the chain.
    const registry = await Cord.Registries.dispatchCreateRegistryToChain(
        registryDetails,
        authorIdentity
    )

    console.log("\n✅ Registry created!")

    // Step 4: Add data into registry
    const entryBlob = {
        name: "Tech Solutions Ltd.",
        description:
            "A technology company providing software development and IT consulting services.",
        metadata: {
            category: "Technology",
            registrationDate: "15-06-2022",
            status: "Active",
            registrationNumber: "TSL12345",
            industry: "Technology",
            regulatoryAuthority: "National Business Bureau",
            documentsProvided: [
                "Incorporation Certificate",
                "Tax Identification Number",
                "Proof of Address",
                "Board Resolution",
            ],
            feePaid: "INR500",
            lastUpdated: "01-10-2024",
        },
    }

    const stringifiedEntryBlob = JSON.stringify(entryBlob)
    const entryDigest = await Cord.Registries.getDigestFromRawData(
        stringifiedEntryBlob
    )

    /// Create a Registry Entry Properties.
    const registryEntryDetails = await Cord.Entries.createEntriesProperties(
        authorIdentity.address,
        registry.uri, //registryUri
        registry.authorizationUri, //registryAuthUri
        entryDigest, //digest
        stringifiedEntryBlob //blob
    )

    console.log(`\n❄️  Registry Entry Create Details `, registryEntryDetails)

    /// Dispatch the Registry Entry to the chain.
    const registryEntry = await Cord.Entries.dispatchCreateEntryToChain(
        registryEntryDetails,
        authorIdentity
    )

    console.log("\n✅ Registry Entry created!", registryEntry)

    // Step 5: Update the registry entry entered
    const updatedEntryBlob = {
        name: "Political Technology Inc.",
        description:
            "A political company providing software development and jumla consulting politics.",
        metadata: {
            category: "Politics",
            registrationDate: "15-06-2022",
            status: "Active",
            registrationNumber: "TSL12345",
            industry: "Technology",
            regulatoryAuthority: "National Business Bureau",
            documentsProvided: [
                "Incorporation Certificate",
                "Tax Identification Number",
                "Proof of Address",
                "Board Resolution",
            ],
            feePaid: "INR50000",
            lastUpdated: "01-10-2024",
        },
    }
    const updateStringifiedEntryBlob = JSON.stringify(updatedEntryBlob)
    const updateEntryDigest = await Cord.Registries.getDigestFromRawData(
        updateStringifiedEntryBlob
    )
    // Create Update Entry Properties
    const registryEntryUpdateDetails =
        await Cord.Entries.updateEntriesProperties(
            registryEntry,
            authorIdentity.address,
            registry.uri,
            registry.authorizationUri,
            updateEntryDigest, //digest
            updateStringifiedEntryBlob //blob
        )
    console.log(
        `\n❄️  Registry Entry Update Details `,
        registryEntryUpdateDetails
    )

    // Dispatch the Property to the chain
    const registryEntryUpdate = await Cord.Entries.dispatchUpdateEntryToChain(
        registryEntryUpdateDetails,
        authorIdentity
    )

    console.log("\n✅ Registry Entry updated!", registryEntryUpdate)
}

main()
    .then(() => console.log("\nBye! 👋 👋 👋 "))
    .finally(Cord.disconnect)
