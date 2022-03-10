import web3 from '@solana/web3.js'
import splToken from '@solana/spl-token'
import SessionStorageService from '../wallet/SessionStorageService.js';
import {
  ACTIVE_CLUSTER,
  TRANSACTION_EXPLORERS,
  gSAIL_TOKEN_ADDRESS,
  SAIL_TOKEN_ADDRESS,
} from '../../config/index.js'
import DB from '../publicKeyStorage/index.js'

function txLink( signature, explorer = TRANSACTION_EXPLORERS.SOLSCAN ) {
  console.assert( signature )
  return explorer.replace( '%s', signature );
}

const createWallet = async (id) => {
  const connection = new web3.Connection(web3.clusterApiUrl(ACTIVE_CLUSTER), 'confirmed');
  var wallet = web3.Keypair.generate();

  await Promise.all([
    SessionStorageService.setKeyPair(id, wallet.secretKey, wallet.publicKey.toString()),
    SessionStorageService.setCluster(id, ACTIVE_CLUSTER),
  ]);

  try {
    await DB.saveUser({
      discordId: id,
      publicKey: wallet.publicKey.toString()
    });
  } catch (error) {
    console.log("Cannot save the user to database");
  }

  return {
    privateKey: wallet.secretKey,
    publicKey: wallet.publicKey.toString(),
  };
};

const importWallet = async (id, keyArr) => {
  const connection = new web3.Connection(web3.clusterApiUrl(ACTIVE_CLUSTER), 'confirmed');
  let wallet;
  try {
    wallet = web3.Keypair.fromSecretKey(new Uint8Array(keyArr));
  } catch (error) {
    return {
      status: false,
    };
  }

  await Promise.all([
    SessionStorageService.setKeyPair(id, wallet.secretKey, wallet.publicKey.toString()),
    SessionStorageService.setCluster(id, ACTIVE_CLUSTER),
  ]);

  try {
    await DB.saveUser({
      discordId: id,
      publicKey: wallet.publicKey.toString()
    });
  } catch (error) {
    console.log("Cannot save the user to database");
  }

  return {
    status: true,
    privateKey: wallet.secretKey,
    publicKey: wallet.publicKey.toString(),
  };
};

const getSolBalance = async (publicKey) => {
  const connection = new web3.Connection(web3.clusterApiUrl(ACTIVE_CLUSTER), 'confirmed');

  try {
    let amount = await connection.getBalance(new web3.PublicKey(publicKey)) / web3.LAMPORTS_PER_SOL;

    return {
      status: true,
      amount: amount,
    };
  } catch (error) {
    return {
      status: false,
      amount: 0
    };
  }
};

const getGSAILBalance = async (privateKey) => {
  const connection = new web3.Connection(web3.clusterApiUrl(ACTIVE_CLUSTER), 'confirmed');
  var wallet = web3.Keypair.fromSecretKey(new Uint8Array(Object.values(privateKey)));

  let token = await new splToken.Token(
    connection,
    new web3.PublicKey(gSAIL_TOKEN_ADDRESS),
    splToken.TOKEN_PROGRAM_ID,
    wallet
  );

  let account;

  try {
    // get the token account of this solana address, if it does not exist, create it
    account = await token.getOrCreateAssociatedAccountInfo(
      wallet.publicKey
    )
  } catch (error) {
    return {
      isExistToken: false,
      amount: 0
    };
  }

  return {
    isExistToken: true,
    amount: account.amount / 1000000000
  };
}

const getSAILBalance = async (privateKey) => {
  const connection = new web3.Connection(web3.clusterApiUrl(ACTIVE_CLUSTER), 'confirmed');
  var wallet = web3.Keypair.fromSecretKey(new Uint8Array(Object.values(privateKey)));

  let token = await new splToken.Token(
    connection,
    new web3.PublicKey(SAIL_TOKEN_ADDRESS),
    splToken.TOKEN_PROGRAM_ID,
    wallet
  );

  let account;

  try {
    // get the token account of this solana address, if it does not exist, create it
    account = await token.getOrCreateAssociatedAccountInfo(
      wallet.publicKey
    )
  } catch (error) {
    return {
      isExistToken: false,
      amount: 0
    };
  }

  return {
    isExistToken: true,
    amount: account.amount / 1000000
  };
}

const transferSOL = async (fromPrivateKey, toPubKey, sol, desc) => {
  const connection = new web3.Connection(web3.clusterApiUrl(ACTIVE_CLUSTER), 'confirmed');
  let signature,
      fromWallet = web3.Keypair.fromSecretKey(new Uint8Array(Object.values(fromPrivateKey)));

  try {
    // Add transfer instruction to transaction
    let transaction = new web3.Transaction().add(
      web3.SystemProgram.transfer({
        fromPubkey: fromWallet.publicKey,
        toPubkey: new web3.PublicKey(toPubKey),
        lamports: sol * web3.LAMPORTS_PER_SOL,
      }),
    ).add(new web3.TransactionInstruction({
      keys: [],
      programId: new web3.PublicKey("MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr"),
      data: Buffer.from(desc),
    }));

    // Sign transaction, broadcast, and confirm
    signature = await web3.sendAndConfirmTransaction(
      connection,
      transaction,
      [fromWallet],
    );

    console.log(signature);
  } catch (error) {
    console.log(`error: ${error}\nstack: ${error.stack}`);
    return {success: false, error};
  }

    return {success: true, signature};
};

const transferSAIL = async (fromPrivateKey, toPubKey, amount, desc) => {
  const connection = new web3.Connection(web3.clusterApiUrl(ACTIVE_CLUSTER), 'confirmed');
  let signature,
      fromWallet = web3.Keypair.fromSecretKey(new Uint8Array(Object.values(fromPrivateKey)));

  let token = await new splToken.Token(
    connection,
    new web3.PublicKey(SAIL_TOKEN_ADDRESS),
    splToken.TOKEN_PROGRAM_ID,
    fromWallet
  );

  let fromTokenAccount;
  try {
    // get the token account of this solana address, if it does not exist, create it
    fromTokenAccount = await token.getOrCreateAssociatedAccountInfo(
      fromWallet.publicKey
    )
  } catch (error) {
    console.log(`error: ${error}\nstack: ${error.stack}`);
    return {success: false, error};
  }

  let toTokenAccount;
  try {
    toTokenAccount = await token.getOrCreateAssociatedAccountInfo(
      new web3.PublicKey(toPubKey),
    );
  } catch (error) {
    console.log(`error: ${error}\nstack: ${error.stack}`);
    return {success: false, error};
  }

  try {
    var transaction = new web3.Transaction().add(
      splToken.Token.createTransferInstruction(
        splToken.TOKEN_PROGRAM_ID,
        fromTokenAccount.address,
        toTokenAccount.address,
        fromWallet.publicKey,
        [],
        amount * 1000000, // This is transferring 1 token, not 1000000 tokens
      ),
    ).add(new web3.TransactionInstruction({
      keys: [],
      programId: new web3.PublicKey("MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr"),
      data: Buffer.from(desc),
    }));

    signature = await web3.sendAndConfirmTransaction(
      connection,
      transaction,
      [fromWallet],
      {commitment: 'confirmed'},
    );

    console.log(signature);
  } catch (error) {
    console.log(`error: ${error}\nstack: ${error.stack}`);
    return {success: false, error};
  }

  return {success: true, signature};
}

const transferGSAIL = async (fromPrivateKey, toPubKey, amount, desc) => {
  const connection = new web3.Connection(web3.clusterApiUrl(ACTIVE_CLUSTER), 'confirmed');
  let signature,
      fromWallet = web3.Keypair.fromSecretKey(new Uint8Array(Object.values(fromPrivateKey)));

  let token = await new splToken.Token(
    connection,
    new web3.PublicKey(gSAIL_TOKEN_ADDRESS),
    splToken.TOKEN_PROGRAM_ID,
    fromWallet
  );

  let fromTokenAccount;
  try {
    // get the token account of this solana address, if it does not exist, create it
    fromTokenAccount = await token.getOrCreateAssociatedAccountInfo(
      fromWallet.publicKey
    )
  } catch (error) {
    console.log(`error: ${error}\nstack: ${error.stack}`);
    return {success: false, error};
  }

  let toTokenAccount;
  try {
    toTokenAccount = await token.getOrCreateAssociatedAccountInfo(
      new web3.PublicKey(toPubKey),
    );
  } catch (error) {
    console.log(`error: ${error}\nstack: ${error.stack}`);
    return {success: false, error};
  }

  try {
    var transaction = new web3.Transaction().add(
      splToken.Token.createTransferInstruction(
        splToken.TOKEN_PROGRAM_ID,
        fromTokenAccount.address,
        toTokenAccount.address,
        fromWallet.publicKey,
        [],
        amount * 1000000000, // This is transferring 1 token, not 1000000000 tokens
      ),
    ).add(new web3.TransactionInstruction({
      keys: [],
      programId: new web3.PublicKey("MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr"),
      data: Buffer.from(desc),
    }));

    signature = await web3.sendAndConfirmTransaction(
      connection,
      transaction,
      [fromWallet],
      {commitment: 'confirmed'},
    );
    console.log(signature);
  } catch (error) {
    console.log(`error: ${error}\nstack: ${error.stack}`);
    return {success: false, error};
  }

    return {success: true, signature};
}

export default {
  createWallet,
  importWallet,
  getSolBalance,
  getGSAILBalance,
  getSAILBalance,
  transferSOL,
  transferSAIL,
  transferGSAIL,
  txLink,
};