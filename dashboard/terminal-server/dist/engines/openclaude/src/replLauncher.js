import React from 'react';
export async function launchRepl(root, appProps, replProps, renderAndRun) {
    const { App } = await import('./components/App.js');
    const { REPL } = await import('./screens/REPL.js');
    await renderAndRun(root, <App {...appProps}>
      <REPL {...replProps}/>
    </App>);
}
//# sourceMappingURL=replLauncher.js.map