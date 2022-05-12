# SCIM ( with Active Directory ) Example

These are simple instructions to setup SCIM provisioning with Active Directory
(Azure Active Directory is used below, but any other setup should be similar).

1. Make sure your server has SCIM support enabled (i.e.
   `PL_PROVISIONING_BACKEND=directory` and `PL_DIRECTORY_PROVIDERS=scim`).
2. Go to your organization's settings in Padloc and enable Directory Sync. Take
   note of the `Tenant URL` and `Secret Token` values, as you'll need them in
   step 4.
3. In your Active Directory, create a new Enterprise application (you can name
   id "Padloc", for example) and choose Automatic provisioning.
4. Enter the proper `Tenant URL` (you) and `Secret Token` values you got from
   step 2.
5. Test the connection, it should pass.

That is it. You can now optionally try "Provision on demand" to manually
provision some user, or simply "Start provisioning" to get it automatically
synchronizing values every X minutes, depending on your setup.
