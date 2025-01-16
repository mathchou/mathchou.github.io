---
layout: default
---

## Welcome to Choucoin

1. Tool to generate your public and private keys: [Key generator and user registration](./generateRSAkeypair.html)
  - Use the above tool to create a public and private key pair. It also makes a file that you should save (and keep to yourself!) for future reference
  - Submit your name and public key N on the Key generator in order to register your wallet for use
2. Creating and Signing transactions tool: [Transaction Creator](./send-choucoin.html)
  - Here you will find a tool that can be used to send Choucoin
  - Note that the signature algorithm uses SHA-256 to hash the transaction message, then appends ",signed: {RSA-signed hash}"
3. Verifying transactions: [Verification tool](./verify_trans.html)
  - Here is a tool that can verify transactions
  - It is linked to the user registration list posted [here](./generateRSAkeypair.html)
  - You may choose to verify transactions manually by hashing the transaction message (SHA-256) and checking the digital signature of the sender (e=65537)
4. Block Publishing: [Block generating tool](./blocks.html)
  - Here are tools to assist in selecting verified transactions to include in a block. You can:
    - Allot yourself your publishing bonus
    - Select which transactions are valid
	- Sign the block with your digital signature
	- Publish the block to the blockchain
  - As a verifier you can:
    - Verify the block contains only valid transactions
	- Allot yourself your verification bonus
	- Publish the verified block
5. Choosing the next set of {publisher, validators}:
  - validator-candidates are assigned a number based on their sign-up order.
  - based on the last digits of the previous block's signed hash, the next set of publisher and validators is determined.
    - For example: the previous block's signed hash is "106468293798347623498672348"
	- Suppose there are 10 people signed up as validators.
	- The last digit '8' chooses the next publisher.
	- The second to last digit '4'chooses one of the next validators.
	- The third to last digit '3' chooses another validator.
	- This process continues until at least one-third of the candidates are chosen to participate in the next block. So in the example with 10 people, this will continue until 1 publisher and 3 validators (4 total)
	- Note:
	  - we use enough digits in order to include all possible validator-candidates (e.g. for 42 candidates, we use 2-digits per selection)
	  - repeated digits are skipped
	  - digits that are outside of the range of validator-candidates are skipped (e.g. if there are 42 validators, the last two digits '48' is skipped, and '23' is chosen as publisher instead)
6. Penalties:
  - If a publisher or validator is found to have included false transactions (bad signatures, double spending, etc.) then they will forfeit their position as a candidate. They will lose their staked Choucoin&copy; and be required to stake twice as much in order to be re-added to the candidate list.

[back](./)
