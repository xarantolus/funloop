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
		// Transform var, let, const by removing the declaration and replacing it with an assignment
		VariableDeclaration(path) {
			try {
				let declarations = path.get("declarations");

				// Replace the declaration with an assignment
				let newDeclarations = [];

				for (let dec of declarations) {
					let id = dec.get("id");
					let init = dec.get("init");

					// Things like "let x" just get removed
					if (init.node) {
						newDeclarations.push(t.expressionStatement(t.assignmentExpression("=", id.node, init.node as any)));
					}
				}

				// Replace the declaration with the assignment
				path.replaceWithMultiple(newDeclarations);
			} catch (e) {
				console.log("Cannot transform variable declaration: " + e);
			}
		},
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
			// Basically transform while (a) { b } into while (a && (b, true));
			try {
				let body = path.get("body");
				let test = path.get("test");
				// Basically move the body statements into the () part
				// and then remove the body statements
				if (body.isBlockStatement()) {
					let newBody = body.node.body.map((statement) => (statement as any).expression);
					newBody.push(t.booleanLiteral(true)); // could also any other truthy value, maybe think of something better?
					test.replaceWith(t.logicalExpression("&&", path.node.test, t.sequenceExpression(newBody)));
					body.replaceWith(t.emptyStatement());
				}
			} catch (e) {
				console.log("Cannot transform while statement: " + e);
			}
		},
		DoWhileStatement(path) {
			// Transform do { a } while (b) into while (a, b);
			try {
				let body = path.get("body");
				let test = path.get("test");
				if (body.isBlockStatement()) {
					let newBody = body.node.body.map((statement) => (statement as any).expression);
					path.replaceWith(t.whileStatement(t.sequenceExpression(newBody.concat(test.node)), t.emptyStatement()));
					body.replaceWith(t.emptyStatement());
				}
			}
			catch (e) {
				console.log("Cannot transform do while statement: " + e);
			}
		},
		ConditionalExpression(path) {
			// For ternary operators, we check if they do something like a ? (x = y) : (x = z) and transform it into x = a ? y : z
			try {
				let consequent = path.get("consequent");
				let alternate = path.get("alternate");
				let test = path.get("test");

				// Transform a ? (x = y) : (x = z) into x = a ? y : z if possible
				if (consequent.isAssignmentExpression() && alternate.isAssignmentExpression()) {
					let consequentAssignment = consequent.node;
					let alternateAssignment = alternate.node;
					let leftAssignment = consequentAssignment.left;
					let rightAssignment = alternateAssignment.left;
					// Same variable being assigned to
					if (generate(leftAssignment).code === generate(rightAssignment).code) {
						path.replaceWith(
							t.assignmentExpression("=",
								leftAssignment,
								t.conditionalExpression(test.node, consequentAssignment.right, alternateAssignment.right)
							),
						);
						return;
					}
				}
			} catch (e) {
				console.log("Cannot transform ternary: " + e);
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

