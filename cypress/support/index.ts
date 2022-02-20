// ***********************************************************
// This example support/index.js is processed and
// loaded automatically before your test files.
//
// This is a great place to put global configuration and
// behavior that modifies Cypress.
//
// You can change the location of this file or turn off
// automatically serving support files with the
// 'supportFile' configuration option.
//
// You can read more here:
// https://on.cypress.io/configuration
// ***********************************************************

/// <reference types="cypress" />

declare global {
    namespace Cypress {
        interface Chainable {
            /**
             * Custom command to clean all indexeddb.
             * @example cy.clearIndexedDb()
             */
            clearIndexedDb(): Chainable<Element>;

            doWithin(path: string[], fn: () => void, delay?: number): Chainable<void>;

            typeWithin(selector: string, text: string, options?: any): Chainable<void>;

            /**
             * Clear all emails from maildev smtp server
             */
            clearEmails(): Chainable<Response<unknown>>;

            /**
             * Fetch latest email from maildev smtp server and parse 6-digit code from it
             */
            getCodeFromEmail(): Chainable<string>;

            /**
             * Custom command to run all the steps to signup.
             * @example cy.signup()
             */
            signup(email: string): Chainable<void>;

            /**
             * Custom command to run all the steps to login.
             * @example cy.login()
             */
            login(email: string): Chainable<void>;

            /**
             * Custom command to run all the steps to lock the app.
             * @example cy.lock()
             */
            lock(): Chainable<Element>;

            /**
             * Custom command to run all the steps to unlock the app.
             * @example cy.unlock()
             */
            unlock(email: string): Chainable<Element>;

            /**
             * Custom command to run all the steps to signup in the v3 app.
             * @example cy.v3_signup()
             */
            v3_signup(email: string): Chainable<void>;

            /**
             * Custom command to run all the steps to login in the v3 app.
             * @example cy.v3_login()
             */
            v3_login(email: string): Chainable<void>;

            /**
             * Custom command to run all the steps to lock the v3 app.
             * @example cy.v3_lock()
             */
            v3_lock(): Chainable<Element>;

            /**
             * Custom command to run all the steps to unlock the v3 app.
             * @example cy.v3_unlock()
             */
            v3_unlock(email: string): Chainable<Element>;
        }
    }
}

import "./commands";
