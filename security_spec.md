# Security Specification - CondoMaster

## Data Invariants
1. A **Condominium** can only be created by an Admin and must have a valid `adminUid` matching the creator.
2. A **CondoUnit** must belong to an existing Condominium.
3. An **Expense** must be linked to a Condominium.
4. **UserProfiles** can only be modified by the respective user. Role escalations are prohibited via rules unless coming from a trusted path (though for this app, we have a "Become Admin" button for demo purposes, so we'll allow self-promotion for now as requested by the UI, but usually this is restricted).

## The Dirty Dozen Payloads

1. **Identity Theft (Profile)**: Attempting to update another user's profile role.
2. **Ghost Property**: Creating a Condominium with someone else's UID as `adminUid`.
3. **Millesimi Poisoning**: Setting `totalMillesimi` to a negative number or a huge string.
4. **Unauthorized Expense**: A non-admin user trying to record an expense for a condo.
5. **Orphaned Unit**: Creating a unit with a non-existent `condoId`.
6. **Timeline Alteration**: Setting `createdAt` to a date in 1970 instead of `request.time`.
7. **Role Escalation**: A `condomino` trying to update their role to `admin` without authorization (wait, the app UI allows this via a button, so I'll allow `update` with `role` for now, but I'll add a check that the uid matches).
8. **PII Leak**: Attempting to read all user profiles (listing the `users` collection).
9. **Price Injection**: Setting expense amount to "infinity" or a non-numeric value.
10. **Shadow Admin**: Deleting a condo created by another admin.
11. **Unit Overwrite**: Updating unit number of a unit I don't own/manage.
12. **System Bypass**: Accessing `expenses` of a condo I'm not associated with (as a condomino).

## Evaluation

| Collection | Identity Spoofing | State Shortcutting | Resource Poisoning |
|------------|-------------------|-------------------|--------------------|
| users      | Blocked (uid match)| N/A               | Blocked (size)     |
| condos     | Blocked (adminUid)| N/A               | Blocked (size/type)|
| units      | Blocked (admin)   | N/A               | Blocked (size/type)|
| expenses   | Blocked (admin)   | N/A               | Blocked (size/type)|
