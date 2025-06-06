export function parseArgs(argv = process.argv.slice(2)) {
  const args = {
    command: null,
    file: null,
    options: {},
    _: [],  // Array for positional arguments
    mode: 'interactive',  // Default mode
    isPiped: !process.stdin.isTTY,  // Detect piped input
    pipeContent: null
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
      const flag = arg.slice(1);
      
      // Handle single character flags with special behavior
      if (flag.length === 1) {
        switch(flag) {
          case 'p':
            args.options.print = true;
            args.mode = 'print';
            break;
          case 'c':
            args.options.continue = true;
            args.mode = 'continue';
            break;
          case 'r':
            args.options.resume = true;
            args.mode = 'resume';
            // Next arg might be session ID
            if (argv[i + 1] && !argv[i + 1].startsWith('-')) {
              args.options.sessionId = argv[i + 1];
              i++;
            }
            break;
          case 'd':
            args.options.debug = true;
            break;
          case 'h':
            args.options.help = true;
            break;
          case 'v':
            args.options.version = true;
            break;
          default:
            args.options[flag] = true;
        }
      } else {
        // Handle multi-character flags
        args.options[flag] = true;
        if (flag === 'print') {
          args.mode = 'print';
        } else if (flag === 'continue') {
          args.mode = 'continue';
        } else if (flag === 'resume') {
          args.mode = 'resume';
        }
      }
      i++;
    } else {
      // Add to positional arguments array
      args._.push(arg);
      
      // Legacy support for command and file
      if (!args.command) {
        args.command = arg;
      } else if (!args.file) {
        args.file = arg;
      }
      i++;
    }
  }

  // Handle special modes and prompt extraction
  if (args.isPiped) {
    args.mode = 'pipe';
  } else if (args.options.print && args._.length > 0) {
    args.mode = 'print';
    args.prompt = args._.join(' ');
  } else if (args._.length > 0 && !args.options.continue && !args.options.resume) {
    args.mode = 'command';
  }

  // Shortcuts and aliases
  args.help = args.options.help || args.options.h;
  args.version = args.options.version || args.options.v;
  args.print = args.options.print;
  args.continue = args.options.continue;
  args.resume = args.options.resume;
  args.sessionId = args.options.sessionId;
  args.debug = args.options.debug;
  args.model = args.options.model || 'deepseek-coder:6.7b-instruct-q4_K_M';
  args.outputFormat = args.options['output-format'] || 'text';
  args.patterns = args.options.patterns ? args.options.patterns.split(',') : [];
  args.verbose = args.options.verbose || false;
  args.plan = args.options.plan || false;
  
  // Claude Code CLI style options
  args.claude = args.options.claude || false;
  if (args.claude) {
    args.mode = 'claude';
  }

  return args;
}