import {
    OutputBuilder,
    RECOMMENDED_MIN_FEE_VALUE,
    TransactionBuilder,
    SLong,
    SInt
} from '@fleet-sdk/core';
import { ergo_tree_address } from './envs';
import { SString } from './utils';
import { sha256 } from './sha256';
import { type Project } from './project';
import { get } from 'svelte/store';
import { address, ergBalance } from './store';

// Function to submit a project to the blockchain
export async function withdraw(
    project: Project,
    amount: number
): Promise<string|null> {
    
    console.log("wants withdraw ", amount)

    // Get the wallet address (will be the project address)
    const walletPk = await ergo.get_change_address();
    
    // Get the UTXOs from the current wallet to use as inputs
    const inputs = [project.box, ...(await ergo.get_utxos())];

    // Building the project output
    let outputs: OutputBuilder[] = [];
    const contractOutput = new OutputBuilder(
        BigInt(project.value - amount),
        ergo_tree_address    // Address of the project contract
    );

    const devAddress = "0xabcdefghijklmnñoqrstuvwxyz";
    const devFeePercentage = 5;
    let devAmount = amount * devFeePercentage/100;

    contractOutput.addTokens({
        tokenId: project.token_id,
        amount: project.total_amount.toString()
    }, {sum: true});

    // Set additional registers in the output box
    contractOutput.setAdditionalRegisters({
        R4: SInt(project.block_limit).toHex(),                 // Block limit for withdrawals/refunds
        R5: SLong(BigInt(project.minimum_amount)).toHex(),                             // Minimum sold
        R6: SLong(BigInt(project.amount_sold)).toHex(),                                // Tokens sold counter
        R7: SLong(BigInt(project.exchange_rate)).toHex(),              // Exchange rate ERG/Token
        R8: SString(await sha256(walletPk)),                        // Withdrawal address (hash of walletPk)
        R9: SString(project.link)                                   // Link or hash with project info
    });
    outputs.push(contractOutput);

    const userOutput = new OutputBuilder(
        BigInt(Number(get(ergBalance))  + amount - devAmount),
        get(address) ?? ""
    );
    outputs.push(userOutput);

    const devOutput = new OutputBuilder(
        BigInt(devAmount),
        devAddress
    )
    outputs.push(devOutput);
    

    // Building the unsigned transaction
    const unsignedTransaction = await new TransactionBuilder(await ergo.get_current_height())
        .from(inputs)                          // Inputs coming from the user's UTXOs
        .to(outputs)                           // Outputs (the new project box)
        .sendChangeTo(walletPk)                // Send change back to the wallet
        .payFee(RECOMMENDED_MIN_FEE_VALUE)     // Pay the recommended minimum fee
        .build()                               // Build the transaction
        .toEIP12Object();                      // Convert the transaction to an EIP-12 compatible object

    // Sign the transaction
    const signedTransaction = await ergo.sign_tx(unsignedTransaction);

    // Send the transaction to the Ergo network
    const transactionId = await ergo.submit_tx(signedTransaction);

    console.log("Transaction id -> ", transactionId);
    return transactionId;
}
