// import { Compiler } from "../Base/Compiler";
// import { FileUtils } from "../Base/FileUtils";
// import { ILabel, ILabelTree } from "../Base/Label";

// interface TreeData {
// 	parent: string;
// 	showName: string;
// 	children: TreeData[];
// 	comment?: string;
// }

// export class LabelTrees {
// 	static GetLabelTrees(filePath: string) {
// 		const fileHash = FileUtils.GetFilePathHashcode(filePath);
// 		const labelTree = Compiler.enviroment.labelTree.global;
// 		const result: TreeData[] = [];
// 		LabelTrees.SaveLabelTreeData(Compiler.enviroment.allLabel.global, labelTree, result);
// 	}

// 	private static SaveLabelTreeData(allLabel: Map<string, ILabel>, labelTree: Map<string, ILabelTree>, result: TreeData[]) {
// 		labelTree.forEach((tree, key) => {
// 			const treeData:TreeData = {
// 				parent: tree.parent,
// 				showName: key,
// 				children: [],
// 				comment: allLabel.get(key)?.comment
// 			}
// 			result.push(treeData);
// 		});
// 	}
// }