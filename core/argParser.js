export function parseArgs(argv) {
  const args = {
    command: null,
    file: null,
    options: {}
  };

  let i = 0;
  while (i < argv.length) {
    const arg = argv[i];

    if (arg.startsWith('--')) {
      const key = arg.slice(2);
      if (argv[i + 1] && !argv[i + 1].startsWith('-')) {
        args.options[key] = argv[i + 1];
        i += 2;
      } else {
        args.options[key] = true;
        i++;
      }
    } else if (arg.startsWith('-')) {
      const flags = arg.slice(1).split('');
      flags.forEach(flag => {
        args.options[flag] = true;
      });
      i++;
    } else {
      if (!args.command) {
        args.command = arg;
      } else if (!args.file) {
        args.file = arg;
      }
      i++;
    }
  }

  // Shortcuts
  args.help = args.options.help || args.options.h;
  args.version = args.options.version || args.options.v;
  args.model = args.options.model || 'claude-3-sonnet';

  return args;
}