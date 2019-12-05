# Padloc Localization Package

This package contains translations, word lists and various localization tools for the Padloc app.

## How To Contribute

### Translations

One of the easiest ways to contribute to this project is to help create or improve translations in your
language. Translations are stored as simple [JSON](https://www.json.org/) files in the following format:

```json
[
    [
        "Hello World", // Original text in English
        "Hallo Welt" // Translation
    ],
    [
        "{0} times {1} makes {2}", // Original text with placeholders
        "{0} mal {1} ergibt {2}" // Translation with placeholders
    ]
]
```

To add or update a translation for a given text, simply locate the translation file for your language
in the [translations directory](packages/locale/res/translations/), find the text you want to translate
and insert your translation below. If no translation file for you language
exists yet, you can start from scratch, using [this empty translations
file](packages/locale/res/translations/_template.json). Simply copy it and name
it
`xx.json`, replacing "xx" with the appropriate lowercase [country
code](https://en.wikipedia.org/wiki/ISO_3166-1_alpha-2#Officially_assigned_code_elements).

### Word Lists

Word lists are used to generate random passphrases from a list of commonly used words from a given language.
You can find all existing word lists [here](packages/locale/res/wordlists/).
