// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract Governance {

    struct Proposal {
        bytes32 name;   // short name (up to 32 bytes)
        uint32 voteCount; // number of accumulated votes
    }

    struct Vote {
        bytes32 proposalName; // short name (up to 32 bytes)
        bool voted;     // is vote already cast for given election
    }

    mapping(bytes32 => Proposal[]) private _elections; // Map election name to list of proposals

    mapping(address => mapping(bytes32 => Vote)) private _voters; // Map users to map of election names to Vote

    uint256 MAX_INT = 115792089237316195423570985008687907853269984665640564039457584007913129639935;

    // Public getter for testing / reading proposals for given election
    function getProposals(bytes32 electionName) public view returns (Proposal[] memory p) {
        p = _elections[electionName];
    }

    function addProposalsToElection(bytes32 electionName, bytes32[] memory proposalNames) public {
        Proposal[] storage proposals = _elections[electionName];

        // Create new proposals
        for (uint i = 0; i < proposalNames.length; i++) {
            // Iterate through proposals each time (assuming very few proposals per election)
            require(findProposalIndex(proposalNames[i], proposals) == MAX_INT, "Proposal name already exists.");
            
            // Push new proposal to storage
            proposals.push(Proposal({
                name: proposalNames[i],
                voteCount: 0
            }));   
        }
    }

    // return max int if proposal is not found
    function findProposalIndex(bytes32 proposalName, Proposal[] memory proposals) private view returns ( uint ) {
        for (uint i = 0; i < proposals.length; i++) {
            if (proposalName == proposals[i].name) {
                return i;
            }
        }
        return MAX_INT;
    }

    function vote(bytes32 electionName, bytes32 proposalName) public {
        // Get users current vote for this election
        Vote storage currentVote = _voters[msg.sender][electionName];

        // If user hasnt voted, set voted to true
        require(!currentVote.voted, "Already voted.");
        currentVote.voted = true;
        currentVote.proposalName = proposalName;

        // Find the proposal that the user is voting for
        uint proposalIndex = findProposalIndex(proposalName, _elections[electionName]);
        require(proposalIndex != MAX_INT, "Proposal not found.");

        // Update Vote Count
        _elections[electionName][proposalIndex].voteCount += 1;
    }

    /// @dev Computes the winning proposal taking all
    /// previous votes into account.
    function winningProposal(bytes32 electionName) private view
            returns (uint winningProposal_)
    {
        Proposal[] storage proposals = _elections[electionName];
        require(proposals.length > 0, "No proposals found.");

        uint winningVoteCount = 0;
        for (uint p = 0; p < proposals.length; p++) {
            if (proposals[p].voteCount > winningVoteCount) {
                winningVoteCount = proposals[p].voteCount;
                winningProposal_ = p;
            }
        }
    }

    // Calls winningProposal() function to get the index
    // of the winner contained in the proposals array and then
    // returns the name of the winner
    function winnerName(bytes32 electionName) public view
            returns (bytes32 winnerName_)
    {
        winnerName_ = _elections[electionName][winningProposal(electionName)].name;
    }
}