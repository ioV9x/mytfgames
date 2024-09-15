# Contributing to My TFGames

👍🎉 First off, thanks for taking the time to contribute! 🎉👍

**The main repository lives currently on [GitGud](https://gitgud.io/ioV9x/mytfgames).** Do not try to create a pull request on GitHub or elsewhere, it will be closed.

All contributions should be made in English. This includes issues, comments, commit messages, and Merge Requests. This is to ensure that everyone can participate in the conversation.

This project adheres to the Contributor Covenant [code of conduct](CODE_OF_CONDUCT.md).
By participating, you are expected to uphold this code.

## Reporting Bugs / Requesting Features

Before creating bug reports or feature requests, please check the [issue tracker](https://gitgud.io/ioV9x/mytfgames/-/issues) as you might find out that your issue has already been reported. When you are creating a bug report, please include as many details as possible. Fill out the required template, the information it asks for helps us resolve issues faster.

## How Can I Contribute Code?

### Prerequisites

- [Node.js](https://nodejs.org/en/download/); it is recommended to use [fnm](https://github.com/Schniz/fnm). You can find the required version in the `.node-version` file.
- [Yarn](https://yarnpkg.com/getting-started/install), i.e. you need to enable corepack (`corepack enable yarn`).

### Basic Workflow Overview

1. Create a new issue or select an existing issue in the [issue tracker](https://gitgud.io/ioV9x/mytfgames/-/issues). This serves as a placeholder for important feedback, review of the solution approach, or any future updates.
2. Mention in the issue that you would like to work on it. Outline your approach and get it reviewed by the maintainers. This is to ensure that your work aligns with the project goals and does not conflict with existing work.
3. Fork the project or sync your fork with the upstream repository.
4. Create your development branch (`git switch -c dev/TCK-XXX-awesome_feature` whereas XXX is the issue id).
5. ???
6. Test the changes locally with `yarn start`. Also make sure your code is properly formatted, and passes all tests and linting rules. You can run `yarn compile:check`, `yarn lint` and `yarn test` to check your code.
7. Commit your changes. The commit messages should follow the [conventional commit format](https://www.conventionalcommits.org/en/v1.0.0/). Put the issue id as a `Ref` footer, e.g. `Ref: #XXX`.
8. Loop back to step 5 until you are satisfied with your changes.
9. Push your branch to your fork (`git push origin dev/TCK-XXX-awesome_feature`).
10. Create a new Merge Request from your fork to the main repository.
