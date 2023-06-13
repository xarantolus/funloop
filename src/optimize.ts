import { parse } from "@babel/parser";
import generate from "@babel/generator";
import traverse from "@babel/traverse";
import * as t from "@babel/types";

export function transformCode(code: string) {
	let ast = parse(code, {
		sourceType: "script",
	});

	// Basically transform for (let i = 0; i < 10; i++) { console.log(i); }
	// into for (let i = 0; i < 10; console.log(i), i++);
	traverse(ast, {
		ForStatement(path) {
			try {
				let body = path.get("body");
				let update = path.get("update");

				// Basically move the body statements into the update part by adding "comma" operators
				// and then remove the body statements
				if (body.isBlockStatement()) {
					let newUpdate = body.node.body.map((statement) => (statement as any).expression);
					newUpdate.push(update.node);
					update.replaceWith(t.expressionStatement(t.sequenceExpression(newUpdate)));
					body.replaceWith(t.emptyStatement());
				}
			} catch (e) {
				// Some code is not supported (e.g. if statements in a for loop body)
				console.log("Cannot transform for statement: " + e);
			}
		},
		WhileStatement(path) {
			try {
				let body = path.get("body");

				// Basically move the body statements into the () part
				// and then remove the body statements
				if (body.isBlockStatement()) {
					// Append body to test with a sequence expression
					let newTest = body.node.body.map((statement) => (statement as any).expression);
					newTest.push(path.node.test);
					path.node.test = t.sequenceExpression(newTest);
					body.replaceWith(t.emptyStatement());
				}
			} catch (e) {
				console.log("Cannot transform while statement: " + e);
			}
		},
		IfStatement(path) {
			let consequent = path.get("consequent");
			let alternate = path.get("alternate") as any;
			let test = path.get("test");

			try {
				// Transform if (a) { b } else { c } into a ? b : c if possible
				if (consequent.isBlockStatement() && alternate.isBlockStatement()) {
					let newTest = test.node;
					let newConsequent = consequent.node.body.map((statement) => (statement as any).expression);
					let newAlternate = alternate.node.body.map((statement: any) => (statement as any).expression);
					path.replaceWith(t.expressionStatement(t.conditionalExpression(newTest, t.sequenceExpression(newConsequent), t.sequenceExpression(newAlternate))));
					return;
				}
			} catch (e) {
				console.log("Cannot transform if/else ternary: " + e);
			}

			try {
				// Transform if (a) { x = y } into x = a ? y : x if possible
				if (consequent.isBlockStatement() && !alternate.isBlockStatement()) {
					// Make sure we only have one statement in the consequent
					if (consequent.node.body.length !== 1) {
						throw new Error("Expected one statement in consequent");
					}

					// Find the variable assignment
					let variableAssignment = consequent.node.body[0];
					if (!t.isExpressionStatement(variableAssignment)) {
						throw new Error("Expected expression statement");
					}

					// Find the assigned expression
					let assignedExpression = (variableAssignment.expression as any);

					path.replaceWith(
						t.assignmentExpression("=",
							assignedExpression.left,
							t.conditionalExpression(test.node, assignedExpression.right, assignedExpression.left)
						),
					);
					return;
				}
			} catch (e) {
				console.log("Cannot transform if assignment statement: " + e);
			}
		}
	});

	const transformedCode = generate(ast, {
		// Basically, we want to keep the original formatting
		// and only change the code that we need to change
		comments: true,
		retainLines: false,
	}, code).code;

	return transformedCode;
}

