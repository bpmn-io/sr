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
        'bpmn-io/moddle#main'
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


  it('should link package of a monorepo', async function() {

    // given
    const options = {
      repo: 'bpmn-io/bpmn-moddle',
      links: [
        'bpmn-io/themes/packages/theme#main'
      ],
      cwd,
      cmd: 'npm run lint'
    };

    // when
    await setupAndRun(options);

    // then
    const linked = path.join(cwd, 'bpmn-io-bpmn-moddle/node_modules/@bpmn-io/theme');

    expect(fs.realpathSync(linked)).to.eql(fs.realpathSync(path.join(cwd, 'bpmn-io-themes/packages/theme')));
  });


  it('should reject conflicting branches of one repository', async function() {

    // given
    const options = {
      repo: 'bpmn-io/bpmn-moddle',
      links: [
        'bpmn-io/themes/packages/theme#main',
        'bpmn-io/themes/packages/c4-theme#some-branch'
      ],
      cwd,
      cmd: 'npm run lint'
    };

    // when
    const error = await setupAndRun(options).catch(err => err);

    // then
    expect(error.message).to.eql('conflicting branches for <bpmn-io/themes>: <main> and <some-branch>');
  });


  it('should reject package path of the target repository', async function() {

    // given
    const options = {
      repo: 'bpmn-io/form-js/packages/form-js-playground',
      cwd,
      cmd: 'npm start'
    };

    // when
    const error = await setupAndRun(options).catch(err => err);

    // then
    expect(error.message).to.eql('package paths are only supported for linked repositories, got <bpmn-io/form-js/packages/form-js-playground>; target <bpmn-io/form-js> and start the package with -c, e.g. a start script of the repository');
  });


  it('should reject repositories sharing a checkout path', async function() {

    // given
    const options = {
      repo: 'foo/bar-baz',
      links: [
        'foo-bar/baz'
      ],
      cwd,
      cmd: 'npm run lint'
    };

    // when
    const error = await setupAndRun(options).catch(err => err);

    // then
    expect(error.message).to.eql(`<foo/bar-baz> and <foo-bar/baz> share the checkout path <${ path.join(cwd, 'foo-bar-baz') }>`);
  });


  it('should link package of the target repository', async function() {

    // given
    const options = {
      repo: 'bpmn-io/themes',
      links: [
        'bpmn-io/themes/packages/theme'
      ],
      cwd,
      cmd: 'npm run lint'
    };

    // when
    await setupAndRun(options);

    // then
    const linked = path.join(cwd, 'bpmn-io-themes/node_modules/@bpmn-io/theme');

    expect(fs.realpathSync(linked)).to.eql(fs.realpathSync(path.join(cwd, 'bpmn-io-themes/packages/theme')));
  });

});