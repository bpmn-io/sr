import { expect } from 'chai';

import { setupAndRun } from '..';

import fs from 'fs';
import os from 'os';
import path from 'path';

const log = console.log;


describe('@bpmn-io/sr', function() {

  // timeout after one minute
  this.timeout(120000);

  let cwd;
  let trace;

  beforeEach(function() {
    trace = [];
    cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'bpmn-io-sr-test-'));

    console.log = function(...args) {
      trace.push(args);
    };
  });

  afterEach(function() {
    console.log = log;

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

    expect(trace).to.eql([
      ['clone %s %s', 'bpmn-io/bpmn-moddle', ''],
      ['clone %s %s', 'bpmn-io/moddle', '(branch=master)'],
      ['install', 'bpmn-io/bpmn-moddle'], [ 'link %s -> %s', 'bpmn-io/moddle', 'bpmn-io/bpmn-moddle'],
      ['run <%s> in %s', 'npm run lint', 'bpmn-io/bpmn-moddle']
    ]);
  });

});