import "dotenv/config";
import { runComboAutomation } from "../src/domain/combos/automation";

runComboAutomation().then(result=>{console.log(JSON.stringify(result,null,2))}).catch(error=>{console.error(error);process.exitCode=1});
