const execa = require('execa').sync;

const path = require('path');


function parseRepository(repositoryString, cwd) {

  const match = /^([^/]+)\/([^#]+)(?:#(.+))?$/.exec(repositoryString);

  if (!match) {
    throw new Error('unparseable repository identifier <' + repositoryString + '>');
  }

  const [
    _,
    org,
    repo,
    branch
  ] = match;

  const name = `${org}/${repo}`;
  const url = `https://github.com/${name}.git`;

  const repositoryPath = path.join(cwd, `${org}-${repo}`);

  return {
    name,
    url,
    path: repositoryPath,
    branch
  };
}

function cli(bin, args, options) {
  return execa(bin, args, options);
}

function printCli(bin, args, options) {
  const { stdout } = cli(bin, args, options);

  console.debug('> %s %s', bin, args.join(' '));
  console.debug(stdout);
}

function link(context, repository, linkedRepository) {

  const {
    verbose
  } = context;

  if (verbose) {
    console.debug('link %s -> %s', linkedRepository.path, repository.path);
  }

  console.log('link %s -> %s', linkedRepository.name, repository.name);

  cli('npm', [ 'link', linkedRepository.path ], { cwd: repository.path });
}

function install(context, repository) {

  const {
    verbose
  } = context;

  if (verbose) {
    console.debug('install %s', repository.path);
  }

  console.log('install', repository.name);

  cli('npm', [ 'install' ], { cwd: repository.path });
}

function clone(context, repository) {

  const {
    path,
    url,
    branch
  } = repository;

  const {
    verbose
  } = context;

  if (verbose) {
    console.debug('clone %s (branch=%s) into %s', url, branch || '', path);
  }

  console.log('clone %s %s', repository.name, branch ? `(branch=${branch})` : '');

  const branchOptions = branch ? [ '-b', branch ] : [];

  cli('git', [ 'clone', url, ...branchOptions, path ]);
}

function run(context, repository, cmd) {

  const {
    verbose
  } = context;

  if (verbose) {
    console.debug('run <%s> in %s', cmd, repository.path);
  }

  console.log('run <%s> in %s', cmd, repository.name);

  const [ executable, ...args ] = cmd.split(/\s/);

  cli(executable, args, { cwd: repository.path });
}

function setupAndRun(options) {

  const {
    repo,
    links = [],
    cmd,
    cwd,
    verbose = false
  } = options;

  if (!cwd) {
    throw new Error('must supply <cwd>');
  }

  if (!cmd) {
    throw new Error('must supply <cmd>');
  }

  if (verbose) {
    printCli('git', [ '--version' ]);
    printCli('npm', [ '--version' ]);

    console.debug('setting up in %s', cwd);
  }

  const repository = parseRepository(repo, cwd);

  const linkedRepositories = links.map(repo => parseRepository(repo, cwd));

  for (const repo of [ repository, ...linkedRepositories ]) {
    clone({ verbose }, repo);
  }

  install({ verbose }, repository);

  for (const linkedRepo of linkedRepositories) {
    link({ verbose }, repository, linkedRepo);
  }

  run({ verbose }, repository, cmd);
}


module.exports.setupAndRun = setupAndRun;