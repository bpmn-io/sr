const mri = require('mri');

const fs = require('fs');
const path = require('path');

const pkg = require('../package.json');

const { setupAndRun } = require('..');


const helpText = `
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
`;

const {
  _,
  link = [],
  version = false,
  cwd = fs.mkdtempSync(path.join(process.cwd(), 'bpmn-io-sr-')),
  cmd = 'npm start',
  verbose = false,
  help = false
} = mri(process.argv.slice(2), {
  boolean: [ 'verbose', 'help', 'version' ],
  alias: {
    v: 'verbose',
    l: 'link',
    h: 'help'
  }
});


if (_.length !== 1) {
  console.error('must supply single target repository');
  process.exit(1);
}

if (version) {
  console.log(pkg.version);
  process.exit(0);
}

if (help) {
  console.log(helpText);

  process.exit(0);
}


setupAndRun({
  repo: _[0],
  links: Array.isArray(link) ? link : [ link ],
  verbose,
  cwd,
  cmd
});