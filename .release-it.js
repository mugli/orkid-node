module.exports = {
  hooks: {
    'before:release': 'npx auto-changelog -p'
  },
  git: {
    changelog: 'npx auto-changelog --stdout --commit-limit false --unreleased --template ./changelog-template.hbs',
    requireCleanWorkingDir: true,
    requireUpstream: true,
    requireCommits: true,
    addUntrackedFiles: false,
    commit: true,
    commitMessage: 'Release ${version}',
    commitArgs: '',
    tag: true,
    tagName: 'v${version}',
    tagAnnotation: 'Release ${version}',
    tagArgs: '',
    push: true,
    pushArgs: '--follow-tags'
  },
  npm: {
    publish: true
  },
  github: {
    release: true,
    releaseName: 'Release ${version}',
    preRelease: false,
    draft: false,
    tokenRef: 'GITHUB_TOKEN'
  }
};
