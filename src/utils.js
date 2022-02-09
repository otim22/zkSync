async function getZkSyncProvider (zksync, networkName) {
    let zkSyncProvider
    try {
        zkSyncProvider = await zksync.getDefaultProvider(networkName)
    } catch (error) {
        console.log('Unable to connect to zkSync.')
        console.log(error)
    }
    return zkSyncProvider
}
  
async function getEthereumProvider (ethers, networkName) {
    let ethersProvider
    try {
        // eslint-disable-next-line new-cap
        ethersProvider = new ethers.getDefaultProvider(networkName)
    } catch (error) {
        console.log('Could not connect to Rinkeby')
        console.log(error)
    }
    return ethersProvider
}
  
async function initAccount (rinkebyWallet, zkSyncProvider, zksync) {
    const zkSyncWallet = await zksync.Wallet.fromEthSigner(rinkebyWallet, zkSyncProvider)
    return zkSyncWallet
}
  
async function registerAccount (wallet) {
    console.log(`Registering the ${wallet.address()} account on zkSync`)
    if (!await wallet.isSigningKeySet()) {
        if (await wallet.getAccountId() === undefined) {
            throw new Error('Unknown account')
        }
        const changePubkey = await wallet.setSigningKey()
        await changePubkey.awaitReceipt()
    }
}

async function depositToZkSync (zkSyncWallet, token, amountToDeposit, tokenSet) {
    const deposit = await zkSyncWallet.depositToSyncFromEthereum({
        depositTo: zkSyncWallet.address(),
        token: token,
        amount: tokenSet.parseToken(token, amountToDeposit)
    })
    try {
        await deposit.awaitReceipt()
    } catch (error) {
        console.log('Error while awaiting confirmation from the zkSync operators.')
        console.log(error)
    }
}

async function transfer (from, toAddress, amountToTransfer, transferFee, token, zksync, tokenSet) {
    const closestPackableAmount = zksync.utils.closestPackableTransactionAmount(tokenSet.parseToken(token, amountToTransfer))
    const closestPackableFee = zksync.utils.closestPackableTransactionFee(tokenSet.parseToken(token, transferFee))
    const transfer = await from.syncTransfer({
        to: toAddress,
        token: token,
        amount: closestPackableAmount,
        fee: closestPackableFee
    })
    const transferReceipt = await transfer.awaitReceipt()
    console.log('Got transfer receipt.')
    console.log(transferReceipt)
}

async function getFee (transactionType, address, token, zkSyncProvider, tokenSet) {
    const feeInWei = await zkSyncProvider.getTransactionFee(transactionType, address, token)
    return tokenSet.formatToken(token, feeInWei.totalFee)
}

async function withdrawToEthereum (wallet, amountToWithdraw, withdrawalFee, token, zksync, tokenSet) {
    const closestPackableAmount = zksync.utils.closestPackableTransactionAmount(tokenSet(token, amountToWithdraw))
    const closestPackableFee = zksync.utils.closestPackableTransactionFee(tokenSet(token, withdrawalFee))
    const withdraw = await wallet.withdrawFromSyncToEthereum({
        ethAddress: wallet.address(),
        token: token,
        amount: closestPackableAmount,
        fee: closestPackableFee
    })
    await withdraw.awaitVerifyReceipt()
  
    console.log('ZKP verification is complete')
}

// Getting accounts
async function displayZkSyncBalance (wallet, ethers) {
    const state = await wallet.getAccountState()
    if (state.committed.balances.ETH) {
        console.log(`Commited ETH balance for ${wallet.address()}: ${ethers.utils.formatEther(state.committed.balances.ETH)}`)
    } else {
        console.log(`Commited ETH balance for ${wallet.address()}: 0`)
    }

    if (state.verified.balances.ETH) {
        console.log(`Verified ETH balance for ${wallet.address()}: ${ethers.utils.formatEther(state.verified.balances.ETH)}`)
    } else {
        console.log(`Verified ETH balance for ${wallet.address()}: 0`)
    }
} 

async function displayZkSyncBalance (wallet, tokenSet) {
    const state = await wallet.getAccountState()
    const commitedBbalances = state.committed.balances
    const verifiedBalances = state.verified.balances
    for (const property in commitedBbalances) {
        console.log(`Commited ${property} balance for ${wallet.address()}: ${tokenSet.formatToken(property, commitedBbalances[property])}`)
    }
    for (const property in verifiedBalances) {
        console.log(`Verified ${property} balance for ${wallet.address()}: ${tokenSet.formatToken(property, verifiedBalances[property])}`)
    }
}

module.exports = {
    getZkSyncProvider,
    getEthereumProvider,
    depositToZkSync,
    registerAccount,
    displayZkSyncBalance,
    transfer,
    withdrawToEthereum,
    getFee,
    initAccount
}
  