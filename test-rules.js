"use strict";
// Test file for Agent Rules Enforcer
Object.defineProperty(exports, "__esModule", { value: true });
function example() {
    console.log("This should trigger an error");
    // TODO: This should trigger a warning
    let message = "This should trigger an info";
    return message;
}
exports.default = example;
//# sourceMappingURL=test-rules.js.map