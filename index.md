---
layout: default
---

# Choucoin

* * *

## Introduction

### Welcome to the future

Hi all, if you're here, no doubt you're interested in obtaining and trading the _fastest_ growing cryptocurrency of 2025, Choucoin&copy;.

This revolutionary cryptocurrency is poised to _revolutionize_ how goods and services are traded all around the world. 

### What is Choucoin&copy;?

I just told you! It's the future! What do you mean? What's a cryptocurrency? C'mon everybody knows that a cryptocurrency is. You know, it's the blockchain and the stuff with the numbers and computers. Also, security, because... you know... it is called *crypto*currency, so obviously cryptography is making it secure and stuff. Anyways, dumb question. Let's move on.

### How can I obtain Choucoin&copy;?

This incredibly sought-after and rare currency is only obtainable by receiving it from someone who already owns it! That's right, it's impossible to obtain.

Lucky for you, by signing up for Professor Chou's **Cryptography** class, you can receive newly minted Choucoin&copy;. For the Spring semester of 2025, each student will receive 20 Choucoin&copy; upon turning in the first homework assignment.

## Setting up a Choucoin&copy; wallet

To begin trading Choucoin&copy;, you first need to set up a wallet. A wallet will contain

*An identifying name
*A public/private key pair

You will find tools to generate a public/private key pair on the [Choucoin&copy; Tools](./choucoin.html) page.

## Trading Choucoin

All transactions should be posted on the class Canvas discussion board.

You may make posts under a name there, but note that anyone can choose any name, so a transaction should not be trusted simply by name alone!

Here is an example of how to give Choucoin (CC) via the message board:

Alice bought an item from Bob for 3 Choucoin. The person who is _giving_ the Choucoin needs to go post the transaction. Alice first needs to create the message which will include the time of the transaction. Her message first begins like:

> TIME: 9/7/24, 14:25:14, Alice gives 3 Choucoin to Bob.

Alice must digitally sign this message in order for us to believe it is her posting this message. To do this, we use the function ``RSAsign()'' found here: [Choucoin&copy; Tools](./choucoin.html). Input your transaction message, public key parameter **N**, and your secret key parameter **d**. This will output your _signed_ message, which will look something like:

> TIME: 9/7/24, 14:25:14, Alice gives 3 Choucoin to Bob.\
> SIGNED: 840321623094276238432491823948267132432983240

This text output is the actual message we want to post to the transaction forum.



# Current Teaching

(Courses taught to be filled in here)

# Research

(List of publications here)




Text can be **bold**, _italic_, or ~~strikethrough~~.

# Choucoin&copy; tools

[Choucoin](./choucoin.html).

There should be whitespace between paragraphs.

There should be whitespace between paragraphs. We recommend including a README, or a file with information about your project.

# Header 1

This is a normal paragraph following a header. GitHub is a code hosting platform for version control and collaboration. It lets you and others work together on projects from anywhere.

## Header 2

> This is a blockquote following a header.
>
> When something is important enough, you do it even if the odds are not in your favor.

### Header 3

```js
// Javascript code with syntax highlighting.
var fun = function lang(l) {
  dateformat.i18n = require('./lang/' + l)
  return true;
}
```

```ruby
# Ruby code with syntax highlighting
GitHubPages::Dependencies.gems.each do |gem, version|
  s.add_dependency(gem, "= #{version}")
end
```

#### Header 4

*   This is an unordered list following a header.
*   This is an unordered list following a header.
*   This is an unordered list following a header.

##### Header 5

1.  This is an ordered list following a header.
2.  This is an ordered list following a header.
3.  This is an ordered list following a header.

###### Header 6

| head1        | head two          | three |
|:-------------|:------------------|:------|
| ok           | good swedish fish | nice  |
| out of stock | good and plenty   | nice  |
| ok           | good `oreos`      | hmm   |
| ok           | good `zoute` drop | yumm  |

### There's a horizontal rule below this.

* * *

### Here is an unordered list:

*   Item foo
*   Item bar
*   Item baz
*   Item zip

### And an ordered list:

1.  Item one
1.  Item two
1.  Item three
1.  Item four

### And a nested list:

- level 1 item
  - level 2 item
  - level 2 item
    - level 3 item
    - level 3 item
- level 1 item
  - level 2 item
  - level 2 item
  - level 2 item
- level 1 item
  - level 2 item
  - level 2 item
- level 1 item

### Small image

![Octocat](https://github.githubassets.com/images/icons/emoji/octocat.png)

### Large image

![Branching](https://guides.github.com/activities/hello-world/branching.png)


### Definition lists can be used with HTML syntax.

<dl>
<dt>Name</dt>
<dd>Godzilla</dd>
<dt>Born</dt>
<dd>1952</dd>
<dt>Birthplace</dt>
<dd>Japan</dd>
<dt>Color</dt>
<dd>Green</dd>
</dl>

```
Long, single-line code blocks should not wrap. They should horizontally scroll if they are too long. This line should be long enough to demonstrate this.
```

```
The final element.
```