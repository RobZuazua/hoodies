// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract Governance {

    struct Proposal {
        bytes32 name;   
        uint32 voteCount; // number of accumulated votes
    }

    struct Vote {
        bytes32 proposalName; // Result of vote
        bool voted;     // already voted?
    }

    // Map election names to a list of proposals
    mapping(bytes32 => Proposal[]) private _elections;

    // Map user addresses to a map of elections they have participated in to their Vote
    mapping(address => mapping(bytes32 => Vote)) private _voters;

    // Hacky. Refactor out in future
    uint256 MAX_INT = 115792089237316195423570985008687907853269984665640564039457584007913129639935;

    // Get proposals of provided election name
    // Returns proposal array or empty proposal array 
    function getProposals(bytes32 electionName) public view returns (Proposal[] memory p) {
        p = _elections[electionName];
    }

    // Adds proposals to a specified election.
    // If election doesnt exist, creates election.
    // No duplicate proposal names allowed
    function addProposalsToElection(bytes32 electionName, bytes32[] memory proposalNames) public {
        Proposal[] storage proposals = _elections[electionName];

        // Create new proposals
        for (uint i = 0; i < proposalNames.length; i++) {
            // No duplicate proposal names allowed 
            require(isNewProposal(proposalNames[i], proposals), "Proposal name already exists.");
            
            // Push new proposal to storage
            proposals.push(Proposal({
                name: proposalNames[i],
                voteCount: 0
            }));   
        }
    }

    function isNewProposal(bytes32 proposalName, Proposal[] memory proposals) private view returns ( bool ) {
        return findProposalIndex(proposalName, proposals) == MAX_INT;
    }

    // Inefficient iteration through proposals (assuming few proposals per election)
    // returns index of proposal or max int
    function findProposalIndex(bytes32 proposalName, Proposal[] memory proposals) private view returns ( uint ) {
        for (uint i = 0; i < proposals.length; i++) {
            if (proposalName == proposals[i].name) {
                return i;
            }
        }
        return MAX_INT;
    }

    // Vote for a proposal in an election.
    // Each address can only vote once per election
    function vote(bytes32 electionName, bytes32 proposalName) public {
        // Get users current vote for this election
        Vote storage currentVote = _voters[msg.sender][electionName];

        // Address can only vote once per election
        require(!currentVote.voted, "Already voted.");
        currentVote.voted = true;
        currentVote.proposalName = proposalName;

        // Find the proposal that the user is voting for
        uint proposalIndex = findProposalIndex(proposalName, _elections[electionName]);
        require(proposalIndex != MAX_INT, "Proposal not found.");

        // Update Vote Count
        _elections[electionName][proposalIndex].voteCount += 1;
    }

    // Calls winningProposal() function to get the index
    // of the winner contained in the proposals array and then
    // returns the name of the winner
    function winnerName(bytes32 electionName) public view
            returns (bytes32 winnerName_)
    {
        winnerName_ = _elections[electionName][winningProposal(electionName)].name;
    }

    // Computes the winning proposal taking all
    // previous votes into account.
    function winningProposal(bytes32 electionName) private view
            returns (uint winningProposal_)
    {
        Proposal[] storage proposals = _elections[electionName];
        require(proposals.length > 0, "No proposals found.");

        // Count votes
        uint winningVoteCount = 0;
        for (uint p = 0; p < proposals.length; p++) {
            if (proposals[p].voteCount > winningVoteCount) {
                winningVoteCount = proposals[p].voteCount;
                winningProposal_ = p;
            }
        }

        require(winningVoteCount > 0, "Must have at least one vote.");

        // Verify no tie
        for (uint p = 0; p < proposals.length; p++) {
            require(proposals[p].voteCount != winningVoteCount || p == winningProposal_, "Multiple Winners Found.");
        }

    }
}