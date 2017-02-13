

export class Profile {
    constructor(adapterProfile) {

        function parseBanks(adapterBanks){
            const banks = {};
            for(let bank in adapterBanks){
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
    constructor(adapterBankProfile){
        this.firstName = adapterBankProfile.firstName;
        this.lastName = adapterBankProfile.lastName;
    }
}