
import './App.css';
import React,{Component} from 'react';
import { Connection, PublicKey, clusterApiUrl, SystemProgram } from '@solana/web3.js';
import { Program, AnchorProvider, web3, utils, BN } from '@project-serum/anchor';
import idl from './idl.json';
import {Buffer} from 'buffer';
window.Buffer = Buffer;

class App extends Component {

  programId = new PublicKey(idl.metadata.address);
  network = clusterApiUrl('devnet');
  opts = {
      preflightCommitment: 'processed'
  }
  SystemProgram = web3;
  

  constructor(props) {
    super(props);
    this.state = {
      walletAddress : null,
      campaigns: []
    }
  }


  getProvide = () => {
    const connection  = new Connection(this.network, this.opts.preflightCommitment);
    const provider =  new AnchorProvider(connection, window.solana, this.opts.preflightCommitment);
    return provider;
  }

  checkIfWalletIsConnected = async() => {
    try{
      const {solana} = window;
      if(solana) {
        if(solana.isPhantom) {
          console.log('Phantom wallet found');
          const response = await solana.connect({onlyIfTrusted: true});
          console.log('Connected with public key', response.publicKey.toString());
          this.setState({walletAddress: response.publicKey.toString()})
        }
      } else {
        alert('Solana object not found. Get Phantom Wallet');
      }
    } catch(err) {
      console.error(err);
    }
  }

  connectWallet = async()=>{
    const {solana} = window;
    if(solana) {
      const response = await solana.connect();
      console.log('Connect with public key:', response.publicKey.toString());
      this.setState({walletAddress: response.publicKey.toString()})
    }
  }

  createCampaign = async() => {
    try {
      const provider = this.getProvide();
      const program = new Program(idl, this.programId, provider);
      const [campaign] = await PublicKey.findProgramAddress([
        utils.bytes.utf8.encode("CAMPAIGN_DEMO"),
        provider.wallet.publicKey.toBuffer()
      ], program.programId);

      await program.rpc.create('campaign name', 'campaign description', {
        accounts :{
          campaign,
          user: provider.wallet.publicKey,
          systemProgram: SystemProgram.programId
        }
      })
      console.log('created new campaign address', campaign.toString());
    } catch(err) {
      console.error(err);
    }
  }

  getCampaign = async() => {
    const connection = new Connection(this.network, this.opts.preflightCommitment);
    const provider = this.getProvide();
    const program = new Program(idl, this.programId, provider);
    Promise.all((await connection.getProgramAccounts(this.programId)).map(
        async campaign => ({
          ...(await program.account.campaign.fetch(campaign.pubkey)), 
          pubkey: campaign.pubkey
        })
      )
    ).then((campaigns) => this.setState({campaigns: campaigns}));
  }

  donate = async(publicKey) => {
    try {
      const provider = this.getProvide();
      const program = new Program(idl, this.programId, provider);
      
      await program.rpc.donate(new BN(0.2 * web3.LAMPORTS_PER_SOL),{
        account: {
          campaign: publicKey,
          user: provider.wallet.publicKey,
          systemProgram: SystemProgram.programId
        }
      })
      console.log("donated some money to:", publicKey.toString());
      this.getCampaign();
    } catch(err) {
      console.error(err);
    }
  }

  withDraw = async(publicKey) => {
    try {
      const provider = this.getProvide();
      const program = new Program(idl, this.programId, provider);

      await program.rpc.withdraw(new BN(0.2 * web3.LAMPORTS_PER_SOL),{
        account: {
          campaign: publicKey,
          user: provider.wallet.publicKey
        }
      })
      console.log("withdraw some money to:", publicKey.toString());
    } catch(err) {
      console.error(err);
    }
  }

  renderNotConnectedContainer = () => {
    return <button onClick={this.connectWallet}>Connect to wallet</button>
  }

  renderConnectedContainer = () => {
    return <>
            <button onClick={this.createCampaign}>Create a campaign...</button>
            <button onClick={this.getCampaign}>Get a list of campaign...</button>
            <br/>
            {this.state.campaigns.map(campaign=>(
              <>
                <p>Campaign Id : {campaign.pubkey.toString()}</p>
                <p>Balance : {(campaign.amountDonated/ web3.LAMPORTS_PER_SOL).toString()}</p>
                <p>{campaign.name}</p>
                <p>{campaign.description}</p>
                <button onClick={() => this.donate(campaign.pubkey)}>Click to Donate</button>
                <button onClick={() => this.withDraw(campaign.pubkey)}>Click to withdraw</button>
              </>
            ))}
            </>;
  }

  componentDidMount = async() => {
    await this.checkIfWalletIsConnected();
  }

  render(){
    return(<div className='App'>
      {!this.state.walletAddress && this.renderNotConnectedContainer()}
      {this.state.walletAddress && this.renderConnectedContainer()}
    </div>)
  }
}

export default App;
