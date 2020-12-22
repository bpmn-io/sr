const execa = require('execa');

const path = require('path');

require('any-observable/register/zen');

const Listr = require('listr');

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

async function printCli(bin, args, options) {
  const { stdout } = await cli(bin, args, options);

  console.debug('> %s %s', bin, args.join(' '));
  console.debug(stdout);
}

async function link(context, repository, linkedRepository) {

  const {
    verbose
  } = context;

  if (verbose) {
    console.debug('link %s -> %s', linkedRepository.path, repository.path);
  }

  console.log('link %s -> %s', linkedRepository.name, repository.name);

  return cli('npm', [ 'link', linkedRepository.path ], { cwd: repository.path });
}

async function install(context, repository) {

  const {
    verbose
  } = context;

  if (verbose) {
    console.debug('install %s', repository.path);
  }

  console.log('install', repository.name);

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
    console.debug('clone %s (branch=%s) into %s', url, branch || '', path);
  }

  console.log('clone %s %s', repository.name, branch ? `(branch=${branch})` : '');

  const branchOptions = branch ? [ '-b', branch ] : [];

  return cli('git', [ 'clone', url, ...branchOptions, path ]);
}

async function run(context, repository, cmd) {

  const {
    verbose
  } = context;

  if (verbose) {
    console.debug('run <%s> in %s', cmd, repository.path);
  }

  console.log('run <%s> in %s', cmd, repository.name);

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

    console.debug('setting up in %s', cwd);
  }

  const repository = parseRepository(repo, cwd);

  const linkedRepositories = links.map(repo => parseRepository(repo, cwd));

  const tasks = new Listr([
    {
      title: 'Clone',
      task: () => {
        return new Listr([ repository, ...linkedRepositories ].map(repo => (
          {
            title: 'Cloning ' + repo.name,
            task: () => clone({ verbose }, repo)
          }
        )), { concurrent: true });
      }
    },
    {
      title: 'Install',
      task: () => {
        return new Listr([
          {
            title: 'Installing ' + repository.name,
            task: () => install({ verbose }, repository)
          }
        ]);
      }
    },
    {
      title: 'Link',
      enabled: () => linkedRepositories.length,
      task: () => {
        return new Listr(linkedRepositories.map(linkedRepo => (
          {
            title: `Linking ${linkedRepo.name} -> ${repository.name}`,
            task: () => link({ verbose }, repository, linkedRepo)
          }
        )));
      }
    },
    {
      title: 'Run',
      task: () => {
        return new Listr(linkedRepositories.map(linkedRepo => (
          {
            title: `Executing ${cmd} in ${repository.name}`,
            task: () => run({ verbose }, repository, cmd)
          }
        )));
      }
    }
  ]);

  return tasks.run();

}


module.exports.setupAndRun = setupAndRun;