import { expect } from 'chai';

import { setupAndRun } from '..';

import fs from 'fs';
import os from 'os';
import path from 'path';


describe('@bpmn-io/sr', function() {

  // timeout after one minute
  this.timeout(120000);

  let cwd;

  beforeEach(function() {
    cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'bpmn-io-sr-test-'));
  });

  afterEach(function() {
    fs.rmdirSync(cwd, { recursive: true });
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