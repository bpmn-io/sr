# sr

[![CI Status](https://img.shields.io/github/workflow/status/bpmn-io/sr/CI/main)](https://github.com/bpmn-io/sr/actions?query=workflow%3ACI)

A simple setup and run utility for bpmn.io based projects.


## Usage

Install the tool globally or run it via `npx`:

```sh
npx @bpmn-io/sr bpmn-io/bpmn-js#some-feature-branch -l bpmn-io/diagram-js#some-feature-branch
```

## Synopsis

```plain
Usage: sr [options] target

Options:
    -l, --link=repo     link the given repository with
                        target repository
    -c, --cmd=test      execute <test> in the target repository
                        per default <npm start> is executed
        --cwd=dir       use <dir> as a working directory

    -h, --help          show this help
    -v, --verbose       enable verbose output

Examples:
  sr -l org/repo1 -l org/repo2#branch org/targetRepo

  sr -c 'npm run test' bpmn-io/diagram-js
```


## License

MIT
