const { expect } = require('chai');

const { setupAndRun } = require('..');

const fs = require('fs');
const path = require('path');


describe('@bpmn-io/sr', function() {

  before(function() {
    fs.rmSync('tmp', { force: true, recursive: true });
    fs.mkdirSync('tmp');
  });

  // timeout after one minute
  this.timeout(120000);

  let cwd;

  beforeEach(function() {
    cwd = fs.mkdtempSync(path.join('tmp', 'bpmn-io-sr-test-'));
  });


  it('should setup and run locally', async function() {

    // given
    const options = {
      repo: 'bpmn-io/bpmn-moddle',
      links: [
        'bpmn-io/moddle#master'
      ],
      cwd,
      cmd: 'npm run lint',
      verbose: true
    };

    // when
    await setupAndRun(options);

    // then
    // projects setup
    expect(fs.existsSync(path.join(cwd, 'bpmn-io-moddle'))).to.be.true;
    expect(fs.existsSync(path.join(cwd, 'bpmn-io-bpmn-moddle'))).to.be.true;

    // project installed
    expect(fs.existsSync(path.join(cwd, 'bpmn-io-bpmn-moddle/node_modules'))).to.be.true;
  });

});