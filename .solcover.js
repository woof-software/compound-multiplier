module.exports = {
    skipFiles: ["interfaces/", "mocks/", "vendor/"],
    mocha: {
        fgrep: "[skip-on-coverage]", // Find everything with this tag.
        invert: true, // Run the grep's inverse set.
        enableTimeouts: false,
        parallel: false
    },
    // measureStatementCoverage: false,
    // measureFunctionCoverage: false,
    irMinimum: !!process.env.VIA_IR, // Comment this line if "stack too deep" with `VIA_IR=true`.
    // Work around "stack too deep".
    configureYulOptimizer: true,
    solcOptimizerDetails: {
        yul: true,
        yulDetails: {
            optimizerSteps: ""
        }
    }
    // Alternative configuration for the Yul optimizer. Try to use it if "stack too deep" errors with the previous one.
    // solcOptimizerDetails: {
    //     peephole: false,
    //     inliner: false,
    //     jumpdestRemover: false,
    //     orderLiterals: true,
    //     deduplicate: false,
    //     cse: false,
    //     constantOptimizer: false,
    //     yul: false
    // }
};
