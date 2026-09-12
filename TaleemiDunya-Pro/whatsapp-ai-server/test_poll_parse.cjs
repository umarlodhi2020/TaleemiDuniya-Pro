const { getAggregateVotesInPollMessage } = require('@whiskeysockets/baileys');

// Let's pretend this is an incoming pollUpdateMessage
const pollUpdateMessage = {
    pollCreationMessageKey: { id: "123", remoteJid: "123@s.whatsapp.net", fromMe: true },
    vote: { /* ... encrypted vote data ... */ },
    metadata: {}
};

// If we just supply the known poll name and options, will it decrypt?
const dummyCreationMessage = {
    message: {
        pollCreationMessage: {
            name: "Menu",
            options: [
                { optionName: "Option 1" },
                { optionName: "Option 2" }
            ],
            selectableOptionsCount: 1
        }
    }
};

// console.log(getAggregateVotesInPollMessage({ message: pollUpdateMessage, key: pollUpdateMessage.pollCreationMessageKey }, [dummyCreationMessage]));
console.log('Script written');
