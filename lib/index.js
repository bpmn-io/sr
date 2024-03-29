const execa = require('execa');

const prexit = require('prexit');
const treeKill = require('tree-kill');

const colors = require('ansi-colors');
colors.enabled = require('color-support').hasBasic;

const highlight = colors.cyan.bold;

const path = require('path');

require('any-observable/register/zen');

const Listr = require('listr');

const tasks = new Set();

prexit(async () => {
  return Promise.all(
    Array.from(tasks.values())
      .map(task => treeKill(task.pid))
  );
});


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
  const task = execa(bin, args, options);

  tasks.add(task);

  return task.finally(() => tasks.delete(task));
}

async function printCli(bin, args, options) {
  console.debug('exec', bin, args, options);

  const { stdout } = await cli(bin, args, options);

  console.debug('> %s %s', bin, args.join(' '));
  console.debug(stdout);
}

async function link(context, repository, linkedRepository) {

  const {
    verbose
  } = context;

  if (verbose) {
    console.debug('Link %s -> %s', linkedRepository.path, repository.path);
  }

  return cli('npm', [
    'link', path.relative(
      repository.path,
      linkedRepository.path
    )
  ], { cwd: repository.path });
}

async function install(context, repository) {

  const {
    verbose
  } = context;

  if (verbose) {
    console.debug('Install %s', repository.path);
  }

  return cli('npm', [ 'install' ], { cwd: repository.path });
}

async function clone(context, repository) {

  const {
    path,
    url,
    branch
  } = repository;

  const {
    verbose
  } = context;

  if (verbose) {
    console.debug('Clone %s (branch=%s) into %s', url, branch || '', path);
  }

  const branchOptions = branch ? [ '-b', branch ] : [];

  return cli('git', [ 'clone', url, ...branchOptions, path ]);
}

async function run(context, repository, cmd) {

  const {
    verbose
  } = context;

  if (verbose) {
    console.debug('Run <%s> in %s', cmd, repository.path);
  }

  const [ executable, ...args ] = cmd.split(/\s/);

  return cli(executable, args, { cwd: repository.path });
}

async function setupAndRun(options) {

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
    await printCli('git', [ '--version' ]);
    await printCli('npm', [ '--version' ]);

    console.debug('Using working directory %s', cwd);
  }

  const repository = parseRepository(repo, cwd);

  const linkedRepositories = links.map(repo => parseRepository(repo, cwd));

  console.log();
  console.log('Setting up %s to execute %s.', highlight(repo), highlight(cmd));
  console.log();

  const renderer = verbose ? 'verbose' : 'default';

  const listr = (tasks, options = {}) => {
    return new Listr(tasks, { ...options, renderer });
  };

  console.log('Cloning...');

  const tasks = listr([
    {
      title: 'Cloning',
      task: () => {
        return listr([ repository, ...linkedRepositories ].map(repo => (
          {
            title: repo.name,
            task: () => clone({ verbose }, repo)
          }
        )), { concurrent: true });
      }
    },
    {
      title: 'Installing',
      task: () => {
        return listr([ repository, ...linkedRepositories ].map(repository => (
          {
            title: `${repository.name}`,
            task: () => install({ verbose }, repository)
          }
        )), { concurrent: true });
      }
    },
    {
      title: 'Linking dependencies',
      enabled: () => linkedRepositories.length,
      task: () => {
        return listr(linkedRepositories.map(linkedRepo => (
          {
            title: `${linkedRepo.name}`,
            task: () => link({ verbose }, repository, linkedRepo)
          }
        )));
      }
    },
    {
      title: `Executing ${highlight(cmd)}`,
      task: () => run({ verbose }, repository, cmd)
    }
  ]);

  return tasks.run();
}


module.exports.setupAndRun = setupAndRun;