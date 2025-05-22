
import { useWallet} from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";

 const { wallet } = useWallet();
// export const useProgram = () => {
// const connection = useConnection();

// const wallet = useAnchorWallet();
// const provider = new AnchorProvider(connection, wallet, {});
// setProvider(provider);
//  const program = new Program(idl , {
//   connection,
// });

// return program;

// }
const programId = new PublicKey("FSSA9w6mrxQoeQw633ALYEsAGPEejSXQtZHfimoZ9BH4");
export const getExpensePDA = async () => {
    
    const [expensePDA] =  PublicKey.findProgramAddressSync(
      [Buffer.from('item'), wallet.publicKey.toBuffer()],
      programId
    );
    return expensePDA;
  
  };