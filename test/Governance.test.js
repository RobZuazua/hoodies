const { accounts, contract } = require('@openzeppelin/test-environment');
const { expectRevert } = require('@openzeppelin/test-helpers');
const { expect } = require('chai');
const Web3 = require('web3');
const web3 = new Web3('http://localhost:8545');

const ELECTION_1_NAME = web3.utils.rightPad(web3.utils.toHex("There is no bread"), 64);
const ELECTION_2_NAME = web3.utils.rightPad(web3.utils.toHex("There is little bread"), 64);
const PROPOSAL_1_NAME = web3.utils.rightPad(web3.utils.toHex("Let them eat cake"), 64);
const PROPOSAL_2_NAME = web3.utils.rightPad(web3.utils.toHex("Why don't they eat poridge"), 64);

const Governance = contract.fromArtifact('Governance');

describe('Test creating elections and proposals', function () {
  const [ owner ] = accounts;

  beforeEach(async function() {
    this.governance = await Governance.new({ from: owner });
  });

  it('Non-existant election should have no proposals', async function () {
    expect(await this.governance.getProposals(ELECTION_1_NAME)).to.be.an('array').that.is.empty;
  });

  it('Add zero proposals to election', async function () {
    await this.governance.addProposalsToElection(ELECTION_1_NAME, []);
    const proposals = await this.governance.getProposals(ELECTION_1_NAME);
    expect(proposals).to.be.an('array').that.is.empty;
  });

  it('Add single proposal to election', async function () {
    await this.governance.addProposalsToElection(ELECTION_1_NAME, [PROPOSAL_1_NAME]);
    const proposals = await this.governance.getProposals(ELECTION_1_NAME);
    expect(proposals).to.be.an('array').to.have.lengthOf(1);
    for (const proposal of proposals) {
        const [name, voteCount] = proposal; // destructure array
        expect(name).to.equal(PROPOSAL_1_NAME);
        expect(voteCount).to.equal('0');
    }
  });

  it('Add two proposals to election', async function () {
    await this.governance.addProposalsToElection(ELECTION_1_NAME, [PROPOSAL_1_NAME, PROPOSAL_2_NAME]);
    const proposals = await this.governance.getProposals(ELECTION_1_NAME);
    expect(proposals).to.be.an('array').to.have.lengthOf(2);
    for (const proposal of proposals) {
        const [name, voteCount] = proposal; // destructure array
        expect(name).to.be.oneOf([PROPOSAL_1_NAME, PROPOSAL_2_NAME]);
        expect(voteCount).to.equal('0');
    }
  });

  it('Add same proposal to election', async function () {
    await expectRevert(this.governance.addProposalsToElection(ELECTION_1_NAME, [PROPOSAL_1_NAME, PROPOSAL_1_NAME]), "Proposal name already exists.");
  });

  it('Add same proposal in subsequent call to election', async function () {
    await this.governance.addProposalsToElection(ELECTION_1_NAME, [PROPOSAL_1_NAME]);
    await expectRevert(this.governance.addProposalsToElection(ELECTION_1_NAME, [PROPOSAL_1_NAME]), "Proposal name already exists.");
  });

  it('Add same proposal to different elections', async function () {
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