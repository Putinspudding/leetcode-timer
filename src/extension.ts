// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as https from 'https';
//import * as fs from 'fs';
import * as path from 'path';
import { Http2ServerRequest } from 'http2';

interface Problem {
	title: string;
	time: number;
}

interface Solution {
	title: string;
	completeness: number;
}

interface Data {
	problems: { [title: string]: Problem };
	solutions: { [title: string]: Solution };
}


// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export async function activate(context: vscode.ExtensionContext) {
	const uri = context.globalStorageUri;
	const config = vscode.workspace.getConfiguration('leetcode-timer');
	const customPath = config.get('customSetting') as string;
	const api = config.get('botApiSetting');

	function makeApiRequest(message: string) {
		const baseUrl = "https://api.telegram.org/bot" + api;
		const fullUrl = baseUrl + "/sendMessage?chat_id=" + "-1001317411526&text=" + message;
		https.get(fullUrl, (response) => { });
	}

	function sendMessage(title: string, message: string) {
		title = title.substring(0, title.lastIndexOf('.'));
		message = "题号：" + title + "%0A"
			+ "用时:" + message;
		makeApiRequest(message);
	}

	async function readData(): Promise<Data> {
		//const uri = vscode.Uri.file('path/to/your/data.json');
		try {
			const fileContent = await vscode.workspace.fs.readFile(uri);
			const jsonData = JSON.parse(fileContent.toString());
			return jsonData as Data;
		} catch (error) {
			console.error('Error reading data:', error);
			const emptyData: Data = {
				problems: {},
				solutions: {}
			};
			return emptyData;
		}
	}

	async function writeData(data: Data): Promise<void> {
		//const uri = vscode.Uri.file('path/to/your/data.json');
		const contentBytes = new TextEncoder().encode(JSON.stringify(data, null, 2));

		try {
			await vscode.workspace.fs.writeFile(uri, contentBytes);
			console.log('Data written to', uri.fsPath);
		} catch (error) {
			console.error('Error writing data:', error);
			throw error;
		}
	}

	async function addProblem(title: string, time: number): Promise<void> {
		const existingData = await readData();

		// 检查是否存在同名问题
		if (existingData.problems[title]) {
			console.error('Problem with the same title already exists:', title);
			return;
		}

		// 添加新问题
		existingData.problems[title] = { title, time };

		// 将修改后的数据写回文件
		await writeData(existingData);
	}

	// 示例：删除一个问题
	async function deleteProblem(title: string): Promise<void> {
		const existingData = await readData();

		// 检查是否存在要删除的问题
		if (!existingData.problems[title]) {
			console.error('Problem not found:', title);
			return;
		}

		// 删除问题
		delete existingData.problems[title];

		// 将修改后的数据写回文件
		await writeData(existingData);
	}

	// 示例：查找问题
	async function findProblem(title: string): Promise<Problem | undefined> {
		const existingData = await readData();
		return existingData.problems[title];
	}

	async function addSolution(title: string, completeness: number): Promise<void> {
		const existingData = await readData();

		// 检查是否存在同名解决方案
		if (existingData.solutions[title]) {
			existingData.solutions[title]['completeness'] += 1;
			//console.error('Solution with the same title already exists:', title);
			return;
		}

		// 添加新解决方案
		existingData.solutions[title] = { title, completeness };

		// 将修改后的数据写回文件
		await writeData(existingData);
	}

	// 示例：查找解决方案
	async function findSolution(title: string): Promise<Solution | undefined> {
		const existingData = await readData();
		return existingData.solutions[title];
	}

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	//console.log('Congratulations, your extension "leetcode-timer" is now active!');

	//console.log(customPath);
	let disposable = vscode.workspace.onDidOpenTextDocument(async (document: vscode.TextDocument) => {
		if (document.isUntitled) {
		} else {
			let fileName = document.fileName;
			if (fileName.startsWith(customPath)) {
				console.log("filename", fileName);
				let fileRelativeName = path.basename(fileName);
				if (await findSolution(fileRelativeName) === undefined) {
					let time = Date.now() / 1000;
					if (await findProblem(fileRelativeName) === undefined) {
						await addProblem(fileRelativeName, time);
					}
				}
			}
			else {
				//vscode.window.showInformationMessage("Not Correct Folder!");
			}
		}

	});
	let disposable1 = vscode.workspace.onDidSaveTextDocument(async (document: vscode.TextDocument) => {
		let fileName = document.fileName;
		if (fileName.startsWith(customPath)) {
			let fileRelativeName = path.basename(fileName);
			let text = document.getText();
			if (text.endsWith('// done') || text.endsWith('// done')) {
				if (await findSolution(fileRelativeName) !== undefined) {
					vscode.window.showInformationMessage('Already solved');
					return;
				}
				let currTime = Date.now() / 1000;
				let problem = await findProblem(fileRelativeName)
				if (problem === undefined) {
				} else {
					//console.log("This is a test");
					let lastTime = problem['time'];
					let timeElapsed = currTime - lastTime;
					deleteProblem(fileRelativeName);
					addSolution(fileRelativeName, timeElapsed);
					const hours = Math.floor(timeElapsed / 3600);
					const minutes = Math.floor((timeElapsed % 3600) / 60);
					const seconds = Math.floor(timeElapsed % 60);
					let tooShort = 0;
					let elapsedTimeString = '';
					if (hours > 0) {
						elapsedTimeString += `${hours} hours, `;
					}

					if (minutes > 0 || hours > 0) {
						elapsedTimeString += `${minutes} minutes, `;
					}

					elapsedTimeString += `${seconds} seconds`;

					sendMessage(fileRelativeName, elapsedTimeString);
				}
				vscode.window.showInformationMessage('File saved with "// done" at the end!');
			}
		}
	});
	//makeApiRequest();
	let f = await readData();
	console.log(f.problems);
	console.log(f.solutions);

	// The command has been defined in the package.json file
	// Now provide the implementation of the command with registerCommand
	// The commandId parameter must match the command field in package.json
	//let disposable = vscode.commands.registerCommand('leetcode-timer.helloWorld', () => {
	//	// The code you place here will be executed every time your command is executed
	//	// Display a message box to the user
	//	vscode.window.showInformationMessage('Hello World from Leetcode Timer!');
	//});

	context.subscriptions.push(disposable);
	context.subscriptions.push(disposable1);
}

// This method is called when your extension is deactivated
export function deactivate() { }
