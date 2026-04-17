import React from 'react';
export async function launchRepl(root, appProps, replProps, renderAndRun) {
    const { App } = await import('./components/App.js');
    const { REPL } = await import('./screens/REPL.js');
    await renderAndRun(root, React.createElement(App, { ...appProps },
        React.createElement(REPL, { ...replProps })));
}
//# sourceMappingURL=replLauncher.js.map