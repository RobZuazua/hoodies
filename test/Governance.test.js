const { accounts, contract } = require('@openzeppelin/test-environment');
const { expectRevert } = require('@openzeppelin/test-helpers');
const { expect } = require('chai');
const Web3 = require('web3');
const web3 = new Web3('http://localhost:8545');

const BYTES_32_PADDING = 64;
const ELECTION_1_NAME = web3.utils.rightPad(web3.utils.toHex("There is no bread"), BYTES_32_PADDING);
const PROPOSAL_1_NAME = web3.utils.rightPad(web3.utils.toHex("Let them eat cake"), BYTES_32_PADDING);
const PROPOSAL_2_NAME = web3.utils.rightPad(web3.utils.toHex("Why don't they eat poridge"), BYTES_32_PADDING);
const ELECTION_2_NAME = web3.utils.rightPad(web3.utils.toHex("Hoodies or suits?"), BYTES_32_PADDING);

const ERROR_PROPOSAL_NOT_FOUND = "Proposal not found.";
const ERROR_NO_PROPOSALS_FOUND = "No proposals found.";
const ERROR_ALREADY_VOTED = "Already voted."
const ERROR_PROPOSAL_EXISTS = "Proposal name already exists.";
const ERROR_TIE = "Multiple Winners Found.";
const ERROR_NO_WINNER = "Must have at least one vote.";

const Governance = contract.fromArtifact('Governance');

describe('Test governance contract without elections / proposals', function () {
  const [ owner ] = accounts;

  beforeEach(async function() {
    this.governance = await Governance.new({ from: owner });
  });

  it('Test with no elections and no proposals. Voting not allowed. No winner.', async function () {
    expect(await this.governance.getProposals(ELECTION_1_NAME)).to.be.an('array').that.is.empty;
    await expectRevert(this.governance.vote(ELECTION_1_NAME, PROPOSAL_1_NAME), ERROR_PROPOSAL_NOT_FOUND);
    await expectRevert(this.governance.winnerName(ELECTION_1_NAME), ERROR_NO_PROPOSALS_FOUND);
  });

  it('Test with one election and no proposals. Voting not allowed. No winner.', async function () {
    await this.governance.addProposalsToElection(ELECTION_1_NAME, []);
    const proposals = await this.governance.getProposals(ELECTION_1_NAME);
    expect(proposals).to.be.an('array').that.is.empty;
    await expectRevert(this.governance.vote(ELECTION_1_NAME, PROPOSAL_1_NAME), ERROR_PROPOSAL_NOT_FOUND);
    await expectRevert(this.governance.winnerName(ELECTION_1_NAME), ERROR_NO_PROPOSALS_FOUND);
  });
});

describe('Test governance contract with single proposal', function () {
    const [ owner, voter2, voter3, voter4 ] = accounts;
  
    beforeEach(async function() {
      this.governance = await Governance.new({ from: owner });
    });
  
    it('Test with single proposal and single election. Vote and declare winner.', async function () {
        await this.governance.addProposalsToElection(ELECTION_1_NAME, [PROPOSAL_1_NAME]);
        const proposals = await this.governance.getProposals(ELECTION_1_NAME);
        expect(proposals).to.be.an('array').to.have.lengthOf(1);
        for (const proposal of proposals) {
            const [name, voteCount] = proposal;
            expect(name).to.equal(PROPOSAL_1_NAME);
            expect(voteCount).to.equal('0');
        }
    
        await this.governance.vote(ELECTION_1_NAME, PROPOSAL_1_NAME);
        expect(await this.governance.winnerName(ELECTION_1_NAME)).to.equal(PROPOSAL_1_NAME);
      });
    
      it('Voting twice should fail.', async function () {
        await this.governance.addProposalsToElection(ELECTION_1_NAME, [PROPOSAL_1_NAME]);
        const proposals = await this.governance.getProposals(ELECTION_1_NAME);
        expect(proposals).to.be.an('array').to.have.lengthOf(1);
        for (const proposal of proposals) {
            const [name, voteCount] = proposal;
            expect(name).to.equal(PROPOSAL_1_NAME);
            expect(voteCount).to.equal('0');
        }
    
        await this.governance.vote(ELECTION_1_NAME, PROPOSAL_1_NAME);
        await expectRevert(this.governance.vote(ELECTION_1_NAME, PROPOSAL_1_NAME), ERROR_ALREADY_VOTED);
        expect(await this.governance.winnerName(ELECTION_1_NAME)).to.equal(PROPOSAL_1_NAME);
      });

      it('Test multiple people voting for same proposal.', async function () {
        await this.governance.addProposalsToElection(ELECTION_1_NAME, [PROPOSAL_1_NAME]);
        await this.governance.vote(ELECTION_1_NAME, PROPOSAL_1_NAME);
        await this.governance.vote(ELECTION_1_NAME, PROPOSAL_1_NAME, { from: voter2 });
        await this.governance.vote(ELECTION_1_NAME, PROPOSAL_1_NAME, { from: voter3 });
        await this.governance.vote(ELECTION_1_NAME, PROPOSAL_1_NAME, { from: voter4 });
    
        const proposals = await this.governance.getProposals(ELECTION_1_NAME);
        expect(proposals).to.be.an('array').to.have.lengthOf(1);
        for (const proposal of proposals) {
            const [name, voteCount] = proposal;
            expect(name).to.equal(PROPOSAL_1_NAME);
            expect(voteCount).to.equal('4');
        }
    
        expect(await this.governance.winnerName(ELECTION_1_NAME)).to.equal(PROPOSAL_1_NAME);
      });

      it('Test adding two proposals to same election', async function () {
        await expectRevert(this.governance.addProposalsToElection(ELECTION_1_NAME, [PROPOSAL_1_NAME, PROPOSAL_1_NAME]), ERROR_PROPOSAL_EXISTS);
      });

      it('Test adding two proposals to same election in different calls', async function () {
        await this.governance.addProposalsToElection(ELECTION_1_NAME, [PROPOSAL_1_NAME]);
        await expectRevert(this.governance.addProposalsToElection(ELECTION_1_NAME, [PROPOSAL_1_NAME]), ERROR_PROPOSAL_EXISTS);
      });
    
      it('Test adding same proposal to different elections', async function () {
        await this.governance.addProposalsToElection(ELECTION_1_NAME, [PROPOSAL_1_NAME]);
        await this.governance.addProposalsToElection(ELECTION_2_NAME, [PROPOSAL_1_NAME]);
    
        const proposals = await this.governance.getProposals(ELECTION_1_NAME);
        expect(proposals).to.be.an('array').to.have.lengthOf(1);
        for (const proposal of proposals) {
            const [name, voteCount] = proposal; // destructure array
            expect(name).to.equal(PROPOSAL_1_NAME);
            expect(voteCount).to.equal('0');
        }
    
        const proposalsElection2 = await this.governance.getProposals(ELECTION_2_NAME);
        expect(proposalsElection2).to.be.an('array').to.have.lengthOf(1);
        for (const proposal of proposalsElection2) {
            const [name, voteCount] = proposal; // destructure array
            expect(name).to.equal(PROPOSAL_1_NAME);
            expect(voteCount).to.equal('0');
        }
      });
  });

  describe('Test governance contract with multiple proposals', function () {
    const [ owner, voter2, voter3, voter4 ] = accounts;
  
    beforeEach(async function() {
      this.governance = await Governance.new({ from: owner });
    });
  
    it('Test that upon failed vote, can vote again', async function () {
        await this.governance.addProposalsToElection(ELECTION_1_NAME, [PROPOSAL_1_NAME]);
        const proposals = await this.governance.getProposals(ELECTION_1_NAME);
        expect(proposals).to.be.an('array').to.have.lengthOf(1);
        for (const proposal of proposals) {
            const [name, voteCount] = proposal; // destructure array
            expect(name).to.equal(PROPOSAL_1_NAME);
            expect(voteCount).to.equal('0');
        }
    
        await expectRevert(this.governance.vote(ELECTION_1_NAME, PROPOSAL_2_NAME), ERROR_PROPOSAL_NOT_FOUND);
        await this.governance.vote(ELECTION_1_NAME, PROPOSAL_1_NAME);
        expect(await this.governance.winnerName(ELECTION_1_NAME)).to.equal(PROPOSAL_1_NAME);
      });
    
      it('Test voting for two different proposals in same election.', async function () {
        await this.governance.addProposalsToElection(ELECTION_1_NAME, [PROPOSAL_1_NAME]);
        await this.governance.addProposalsToElection(ELECTION_1_NAME, [PROPOSAL_2_NAME]);
        await this.governance.vote(ELECTION_1_NAME, PROPOSAL_1_NAME);
        await expectRevert(this.governance.vote(ELECTION_1_NAME, PROPOSAL_2_NAME), ERROR_ALREADY_VOTED);
      });
    
      it('Test adding two proposals to an election', async function () {
        await this.governance.addProposalsToElection(ELECTION_1_NAME, [PROPOSAL_1_NAME, PROPOSAL_2_NAME]);
        const proposals = await this.governance.getProposals(ELECTION_1_NAME);
        expect(proposals).to.be.an('array').to.have.lengthOf(2);
        for (const proposal of proposals) {
            const [name, voteCount] = proposal; // destructure array
            expect(name).to.be.oneOf([PROPOSAL_1_NAME, PROPOSAL_2_NAME]);
            expect(voteCount).to.equal('0');
        }
      });
    
      it('Test counting votes.', async function () {
        await this.governance.addProposalsToElection(ELECTION_1_NAME, [PROPOSAL_1_NAME, PROPOSAL_2_NAME]);
        await this.governance.vote(ELECTION_1_NAME, PROPOSAL_1_NAME);
        await this.governance.vote(ELECTION_1_NAME, PROPOSAL_2_NAME, { from: voter2 });
        await this.governance.vote(ELECTION_1_NAME, PROPOSAL_2_NAME, { from: voter3 });
        await this.governance.vote(ELECTION_1_NAME, PROPOSAL_2_NAME, { from: voter4 });
        expect(await this.governance.winnerName(ELECTION_1_NAME)).to.equal(PROPOSAL_2_NAME);
      });
    
      it('Test a voting tie.', async function () {
        await this.governance.addProposalsToElection(ELECTION_1_NAME, [PROPOSAL_1_NAME, PROPOSAL_2_NAME]);
        await this.governance.vote(ELECTION_1_NAME, PROPOSAL_1_NAME);
        await this.governance.vote(ELECTION_1_NAME, PROPOSAL_2_NAME, { from: voter2 });
        await expectRevert(this.governance.winnerName(ELECTION_1_NAME), ERROR_TIE);
      });
    
      it('No one votes in election.', async function () {
        await this.governance.addProposalsToElection(ELECTION_1_NAME, [PROPOSAL_1_NAME, PROPOSAL_2_NAME]);
        await expectRevert(this.governance.winnerName(ELECTION_1_NAME), ERROR_NO_WINNER);
      });
    
  });