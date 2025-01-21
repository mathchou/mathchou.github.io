---
layout: default
---

{% include verify_trans.html %}

To be updated with verification tools.

Needs:

For block publisher:

1. transaction verifier linked to user_id public key list
2. transaction selector
3. upload slot for user_id and signing key
4. auto-generate publication bonus
5. lookup of previous block hash
6. add in time of block creation
7. sign hash of block
8. submit block 

For block verifier:

1. Have place to see most recently published blocks
1. load submited block (/fetch-block/:signedBlockHash)
2. transaction verifier linked to user_id public key list 
3. upload slot for user_id and signing key (upload rsa key file)
4. auto-generate verifier bonus (+1 CC)
5. sign verification bonus (sign hash of new transaction list)
6. submit approved block (/submit-block)


[back](./choucoin.html)
