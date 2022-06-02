# SCIM Example

## With Active Directory (Microsoft / Outlook)

These are simple instructions to setup SCIM provisioning with Active Directory
(Azure Active Directory is used below, but any other setup should be similar).

1. Make sure your server has SCIM support enabled (i.e.
   `PL_PROVISIONING_BACKEND=directory` and `PL_DIRECTORY_PROVIDERS=scim`).
2. Go to your organization's settings in Padloc and enable Directory Sync. Take
   note of the `Tenant URL` and `Secret Token` values, as you'll need them in
   step 4.
3. In your Active Directory, create a new Enterprise application (you can name
   id "Padloc", for example) and choose Automatic provisioning.
4. Enter the proper `Tenant URL` and `Secret Token` values you got from step 2.
5. Test the connection, it should pass.

That is it. You can now optionally try "Provision on demand" to manually
provision some user, or simply "Start provisioning" to get it automatically
synchronizing values every X minutes, depending on your setup.

## With SAML SSO (Google Workspaces / Cloud Identity)

These are simple instructions to setup SCIM provisioning with SAML SSO (Google
Workspaces is used below, but any other setup should be similar).

1. Make sure your server has SCIM support enabled (i.e.
   `PL_PROVISIONING_BACKEND=directory` and `PL_DIRECTORY_PROVIDERS=scim`).
2. Go to your organization's settings in Padloc and enable Directory Sync. Take
   note of the `SAML ACS URL` value, as you'll need it in step 4.
3. Follow
   [Google's guide to create a custom SAML app](https://support.google.com/a/answer/6087519).
4. Enter the proper `ACS URL` value you got from step 2, everything else you can
   name as "Padloc" or something for yourself to identify.
5. For the SAML attribute mapping, make sure you set:

```
Primary email -> email

First name -> firstName

Last name -> lastName
```

6. When you test the SAML Login (via Test SAML Login), you should see a SCIM
   response with your user details. You can now close this page and your user
   will have been provisioned already.

That's it. For other users to be provisioned, they just need to login to the app
via SSO, initiated from the Google Console (IdP).
