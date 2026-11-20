const spawn = require('nano-spawn');

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
      .map(task => task.nodeChildProcess.then(
        childProcess => {
          console.debug('Cleanup child_process %s', childProcess.pid);

          return treeKill(childProcess.pid);
        }
      ))
  );
});


function parseRepository(repositoryString, cwd) {

  const match = /^([^/]+)\/([^/#]+)((?:\/[^/#]+)*)(?:#(.+))?$/.exec(repositoryString);

  if (!match) {
    throw new Error('unparseable repository identifier <' + repositoryString + '>');
  }

  const [
    _,
    org,
    repo,
    packagePath,
    branch
  ] = match;

  const name = `${org}/${repo}`;
  const url = `https://github.com/${name}.git`;

  const repositoryPath = path.join(cwd, `${org}-${repo}`);

  return {
    name,
    url,
    path: repositoryPath,
    packagePath,
    linkPath: path.join(repositoryPath, packagePath),
    branch
  };
}

/**
 * Return each repository once, as several packages may come from one repository.
 */
function uniqueRepositories(repositories) {

  const byPath = new Map();

  for (const repository of repositories) {
    const existing = byPath.get(repository.path);

    if (!existing) {
      byPath.set(repository.path, repository);
    } else if (existing.branch !== repository.branch) {
      throw new Error(`conflicting branches for <${ repository.name }>: <${ existing.branch || '' }> and <${ repository.branch || '' }>`);
    }
  }

  return Array.from(byPath.values());
}

function cli(bin, args, options) {
  const task = spawn(bin, args, options);

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
    console.debug('Link %s -> %s', linkedRepository.linkPath, repository.path);
  }

  return cli('npm', [
    'link', path.relative(
      repository.path,
      linkedRepository.linkPath
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

  const repositories = uniqueRepositories([ repository, ...linkedRepositories ]);

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
        return listr(repositories.map(repo => (
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
        return listr(repositories.map(repository => (
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
            title: `${linkedRepo.name}${linkedRepo.packagePath}`,
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


module.exports = {
  setupAndRun
};