
export class Profile {
    constructor(object) {

    }
}

export class BankProfile {
    static parseBbvaProfile(profileRaw) {
        return {
            firstName: profileRaw.firstName,
            lastName: profileRaw.surname
        }
    }
    static parseCitiProfile(profileRaw) {
        return {
            firstName: profileRaw.customerName.firstName,
            lastName: profileRaw.customerName.lastName
        }
    }
}

export class Accounts extends Array {

    static parseBbvaAccounts(accountsRaw) {
        const accounts = new this();

        accountsRaw.forEach(function (a) {
            accounts.push(new Account({
                accountKey: a.id,
                description: a.description,
                name: a.description,
                number: a.number,
                classification: a.type,
                balance: a.balance,
                currency: a.currency,
                detailLink: a.links.detail.href
            }));
        });

        return accounts;
    }

    static parseCitiAccounts(accountsRaw) {
        const accounts = new this();

        accountsRaw.forEach(accountGroup => {
            accountGroup.accounts.forEach(account => {
                let keys = Object.keys(account);
                let actualAccount = account[keys[0]];
                accounts.push(new Account({
                    accountKey: actualAccount.accountId,
                    description: actualAccount.displayAccountNumber,
                    name: actualAccount.productName,
                    number: actualAccount.displayAccountNumber.split(" - ")[1],
                    classification: actualAccount.accountClassification,
                    balance: actualAccount.currentBalance || actualAccount.outstandingBalance,
                    currency: actualAccount.currencyCode,
                    detailLink: undefined
                }))
            })
        })

        return accounts;
    }

}

export class Account {
    constructor(object) {
        this.accountKey = object.accountKey;
        this.description = object.description;
        this.name = object.name;
        this.number = object.number;
        this.classification = object.classification;
        this.balance = object.balance;
        this.currency = object.currency;
        this.detailLink = object.detailLink;
    }
}

export class AccountTransactions extends Array {

    static parseBbvaAccountTransactions(accountTransactions) {
        let transactions = [];
        var days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
        var months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

        accountTransactions.forEach(function (a) {
            var date = new Date(a.operationDate);
            let transaction = new AccountTransaction({
                id: a.id,
                amount: a.amount.toFixed(2),
                category: a.category,
                currency: a.currency,
                description: a.description,
                date: days[date.getDay()].substring(0, 3) + ', ' + months[date.getMonth()].substring(0, 3) + ' ' + date.getDate() + ', ' + date.getFullYear(),
                expense: ((a.amount < 0) ? true : false),
            });
            transactions.push(transaction);
        });

        return transactions.length > 0 ? transactions : undefined;
    }

}

export class AccountTransaction {
    constructor(object) {
        this.id = object.id;
        this.amount = object.amount;
        this.category = object.category;
        this.currency = object.currency;
        this.description = object.description;
        this.date = object.date;
        this.expense = object.expense;
    }
}