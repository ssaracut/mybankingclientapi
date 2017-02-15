/*
may have over complicated this by splitting out an 
AdapterDataTypes and ServiceDataTypes just for the Profile.
*/

export class Profile {
    constructor(adapterProfile) {

        function parseBanks(adapterBanks) {
            const banks = {};
            for (let bank in adapterBanks) {
                banks[bank] = null;
            }
            return banks;
        }

        this.firstName = adapterProfile.firstName;
        this.lastName = adapterProfile.lastName;
        this.email = adapterProfile.email;
        this.banks = parseBanks(adapterProfile.banks);
    }
}

export class BankProfile {
    constructor(adapterBankProfile) {
        this.firstName = adapterBankProfile.firstName;
        this.lastName = adapterBankProfile.lastName;
    }
}

export class Accounts extends Array {
    constructor(adapterAccounts) {
        //Just being lazy and not mapping here
        //when I run into something that needs to 
        //get filtered I'll create an account object
        super();
        adapterAccounts.forEach(account=>{
            this.push(account)
        })
        // this.accountKey = adapterAccounts.accountKey;
        // this.description = adapterAccounts.description;
        // this.name = adapterAccounts.name;
        // this.number = adapterAccounts.number;
        // this.classification = adapterAccounts.classification;
        // this.balance = adapterAccounts.balance;
        // this.currency = adapterAccounts.currency;
        // this.detailLink = adapterAccounts.detailLink;
    }
}