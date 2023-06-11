//Linear Programming Problem.
function LPP(){
	this.type = 'min';
	this.c = [];

	this.constraints = [];

	var that = this;

	this.getNumberOfLines = function(){
		return that.constraints.length;
	};

	this.getNumberOfColumns = function(){
		return that.c.length;
	};

	this.getType = function(){
		return that.type;
	};

	this.getC = function(index){
		if(index >= 0 && index < that.c.length) return that.c[index];
		else return 0;
	};

	this.getCVector = function(){
		return that.c;
	};

	this.getConstraint = function(index){
		return that.constraints[index];
	};

	this.setFunction = function(type, c){
		that.c = c;
		if(type == "max" && that.c.length > 0){
			var first = math.matrix(that.c);
			first = math.multiply(-1,first);
			that.c = first.valueOf();
		}
	};

	this.createConstraint = function(valuesIn, signIn, bIn){
		if(bIn < 0){ 
			bIn *= -1;
			if(signIn == '>') signIn = '<';
			else if(signIn == '<') signIn = '>';
			var ctr = math.matrix(valuesIn);
			ctr = math.multiply(-1,ctr);
			valuesIn = ctr.valueOf();
		}
		var constraint = {values: valuesIn, sign: signIn, b: bIn};
		that.constraints.push(constraint);
		
	};
}

function SimplexTable(lpp){

	this.variablesInBase = []; 

	this.slackVariables = []; 
	this.virtualVariables = []; 
	this.st = math.matrix(); 
	this.lpp = lpp;
	this.firstSolution = null;
	var that = this;

	this.getTable = function(){
		return that.st;
	};

	this.getVariablesInBase = function(){
		return that.variablesInBase;
	};

	var getConstraintTable = function(lpp){
		var listOfSlack = [];
		var numberOfSlacks = 0;
		var jump1 = 0;
		for(var i=0; i<lpp.getNumberOfLines(); i++){
			var constraint = lpp.getConstraint(i);
			switch(constraint.sign){
				case '<':
					numberOfSlacks++;
					listOfSlack.push(1);
					that.slackVariables.push(lpp.getNumberOfColumns()+i-jump1);
					break;
				case '>':
					numberOfSlacks++;
					listOfSlack.push(-1);
					that.slackVariables.push(lpp.getNumberOfColumns()+i-jump1);
					break;
				case '=':
					listOfSlack.push(0);
					jump1++;
					break;
			}
		}
		
		var tempTable = [];
		var jump2 = 0;

		for(var i=0; i<lpp.getNumberOfLines(); i++){
			
			var slacks = math.zeros(numberOfSlacks);
			if(listOfSlack[i] == 0) jump2++;
			else{
				slacks.subset(math.index(i-jump2), listOfSlack[i]);
			}

			var constraint = lpp.getConstraint(i);
			
			var line = math.matrix(constraint.values);
			line = math.concat(line,slacks);

			tempTable.push(line);
		}
		tempTable = math.matrix(tempTable);
		return tempTable;

	};

	var isUnity = function(constraintTable,column){
		var count = 0;
		var ones = 0;
		var pos = -1;
		var size = constraintTable.size();
		var lines = size[0];
		for(var i=0; i <lines; i++){
			var value = constraintTable.subset(math.index(i,column));
			if(value != 0) count++;
			if(value == 1){
				ones++;
				pos = i;
			}
		}
		if(count == 1 && ones == 1) return pos;
		else return null;
	}

	var setVirtualVariables = function(constraintTable){
		var size = constraintTable.size();
		var identity = math.zeros(size[0]);
		var size = constraintTable.size();
		var countVirtual = size[1];
		
		for(var i=0; i<that.slackVariables.length; i++){
			var index = that.slackVariables[i];
			var unit = isUnity(constraintTable,index);
			if(unit != null){
				identity.subset(math.index(unit),index);
			}
		}
		var basics = identity.map(function(value,index,matrix){
			if(value == 0){
				value = countVirtual;
				that.virtualVariables.push(value);
				countVirtual++;
			}
			return value;
		});

		that.variablesInBase = basics.valueOf();
	};

	var setVirtualColumn = function(constraintTable){
		if(that.virtualVariables.length == 0) return constraintTable;

		var size = constraintTable.size();

		for(var i=0; i<that.variablesInBase.length; i++){
			var index = that.variablesInBase[i];
			if(index >= size[1]){ 
				var column = [];
				for(var j=0; j<size[0]; j++){
					if(i==j) column.push([1]);
					else column.push([0]);
				}
				column = math.matrix(column);
				constraintTable = math.concat(constraintTable, column);
			}
		}

		return constraintTable;
	};

	var setBColumn = function(lpp,constraintTable){
		
		var listB = [];
		for(var i=0; i<lpp.getNumberOfLines(); i++){
			var constraint = lpp.getConstraint(i);
			listB.push([constraint.b]);
		}
		var b = math.matrix(listB);
		constraintTable = math.concat(constraintTable,b);
		return constraintTable;
	};

	var setCostLine = function(lpp,constraintTable){
		var weights = [];
		var size = constraintTable.size();
		var limit = size[1] - that.virtualVariables.length-1;
		var addVector = [];

		if(that.virtualVariables.length == 0){
			for(var i=0; i<that.variablesInBase.length; i++){
				var variable = that.variablesInBase[i];
				var value = lpp.getC(variable);
				weights.push(value);
			}
			var first = math.matrix(lpp.getCVector());
			var second = math.zeros(that.slackVariables.length + that.virtualVariables.length);
			addVector = math.concat(first,second);
			addVector = math.concat(addVector,[0]);
		}
		else{
			for(var i=0; i<that.variablesInBase.length; i++){
				var value = that.variablesInBase[i];
				if(value >= limit) weights.push(1);
				else weights.push(0);
			}
			var first = math.zeros(limit);
			var second = math.ones(that.virtualVariables.length);
			addVector = math.concat(first,second);
			addVector = math.concat(addVector,[0]);
		}
		weights = math.matrix(weights);
		
		var costs = math.multiply(weights,constraintTable);
		costs = math.subtract(costs,addVector);
		for(var i=0; i<that.variablesInBase.length; i++){
			var value = that.variablesInBase[i];
			costs.subset(math.index(value),0);
		}

		constraintTable = math.concat([costs.valueOf()],constraintTable,0);

		return constraintTable;
	}

	this.transformFromLPPToSimplexTable = function(){
		var constraintTable = getConstraintTable(that.lpp);
		setVirtualVariables(constraintTable);
		constraintTable = setVirtualColumn(constraintTable);
		constraintTable = setBColumn(that.lpp,constraintTable);

		that.st = setCostLine(that.lpp,constraintTable);
	};

	this.hasVirtualVariableOnTable = function(){
		if(that.virtualVariables.length == 0) return false;
		else return true;
	};

	this.hasVirtualVariableOnBase = function(){
		if(that.virtualVariables.length == 0) return false;
		var size = that.st.size();
		var limit = size[1] -1 - that.virtualVariables.length;
		for(var i=0; i<that.variablesInBase.length; i++){
			if(that.variablesInBase[i] >= limit){
				return true;
			}
		}
		return false;
	};

	this.variableToInBase = function(){
		var size = that.st.size();
		var limit = size[1] -1;
		var variables = math.ones(limit);
		var costs = that.st.subset(math.index(0,[0,limit]));
		var getIn = null;
		var leastCost = null;

		var testZero = that.firstSolution != null || that.hasVirtualVariableOnTable();

		for(var i=0; i<that.variablesInBase.length; i++){
			var index = that.variablesInBase[i];
			variables.subset(math.index(index),0);
		}
		
		for(var i=0; i<limit; i++){
			var value = variables.subset(math.index(i));
			if(value == 1){
				var cost = costs.subset(math.index(0,i));
				if(testZero){
					if(cost >= 0 && ( leastCost == null || cost > leastCost )){
						getIn = i;
						leastCost = cost;
					}
				}
				else{
					if(cost > 0 && ( leastCost == null || cost > leastCost )){
						getIn = i;
						leastCost = cost;
					}
				}
			}
		}

		return getIn;
	};

	this.variableToOutBase = function(vIn){
		if(vIn == null) return null;

		var size = that.st.size();
		var getOut = null;
		var minimum = null;
		var b = that.st.subset(math.index([1, size[0]],size[1]-1));

		for(var i=0; i<that.variablesInBase.length; i++){
			var yr = that.st.subset(math.index(i+1,vIn));
			if(yr > 0){
				var bi = b.subset(math.index(i,0));
				var value = bi/yr;
				if(minimum == null || value < minimum){
					getOut = that.variablesInBase[i];
					minimum = value;
				}
			}
		}
		return getOut;
	};

	this.isGreatTable = function(){
		var size = that.st.size();
		var limit = size[1] -1;
		var costs = that.st.subset(math.index(0,[0,limit]));

		for(var i=0; i<limit; i++){
			var value = costs.subset(math.index(0,i));
			if(value > 0) return false;
		}
		
		that.firstSolution = [];
		return true;
	};

	this.hasMoreSolutions = function(){
		var vIn = that.variableToInBase();
		var vOut = that.variableToOutBase(vIn);
		if( vIn == null || vOut == null ) return false;
		else return true;
	};

	this.isImpossibleLPP = function(){
		var vIn = that.variableToInBase();
		var vOut = that.variableToOutBase(vIn);
		if( (vIn == null || vOut == null) && that.hasVirtualVariableOnBase()) return true;
		else return false;
	};

	var makePivoting = function(vIn, vOut){
		var size = that.st.size();
		var pos = vOut+1;

		var lineOut = that.st.subset(math.index(pos,[0, size[1]]));
		var baseValue = lineOut.subset(math.index(0,vIn));

		for(var i=0; i<size[0]; i++){
			if(i == pos) continue;

			var currentLine = that.st.subset(math.index(i,[0,size[1]]));
			var value = that.st.subset(math.index(i,vIn));
			value = -1*(value/baseValue);

			var currentLineOut = math.multiply(value,lineOut);
			var newLine = math.add(currentLine, currentLineOut);
			that.st.subset(math.index(i,[0,size[1]]), newLine);
		}
	
		var newLineOut = math.multiply(1/baseValue,lineOut);
		that.st.subset(math.index(pos,[0,size[1]]), newLineOut);
	};

	this.nextTable = function(){
		var vIn = that.variableToInBase();
		var vOut = that.variableToOutBase(vIn);
		if( vIn == null || vOut == null ) return false;

		for(var i=0; i<that.variablesInBase.length; i++){
			if(vOut == that.variablesInBase[i]){
				that.variablesInBase[i] = vIn;
				vOut = i;
				break;
			}
		}
		makePivoting(vIn, vOut);
		return true;
	};

	this.removeVirtualVariables = function(){
		if(that.virtualVariables.length == 0) return;
		if(that.hasVirtualVariableOnBase()) return;
		var size = that.st.size();
		var limit = size[1] -1 - that.virtualVariables.length;
		var b = that.st.subset(math.index([1,size[0]],size[1]-1));
		var newSt = that.st.subset(math.index([1,size[0]],[0,limit]));
		newSt = math.concat(newSt,b);
		that.virtualVariables = [];
		that.st = setCostLine(that.lpp,newSt);
	};

	this.getSolution = function(){
		var size = that.st.size();
		var solution = math.zeros(size[1]-1);
		var b = that.st.subset(math.index([1,size[0]],size[1]-1));

		for(var i=0; i<that.variablesInBase.length; i++){
			var index = that.variablesInBase[i];
			var value = b.subset(math.index(i,0));
			solution.subset(math.index(index),value);
		}
		return solution.valueOf();
	};

	this.getImage = function(){
		var size = that.st.size();
		var image = that.st.subset(math.index(0,size[1]-1));
		return image;
	};

	this.currentIsEqualToFirstSolution = function(){
		if(that.firstSolution == null) return false;

		var solution1 = that.getSolution();
		var solution2 = that.firstSolution;
		if(solution1.length != solution2.length) return false;

		for(var i=0; i<solution1.length; i++){
			if(solution1[i] != solution2[i]) return false;
		}

		return true;
	};

	this.resetNextSolutionLoop = function(){
		if(that.firstSolution != null) that.firstSolution = [];
	};

	this.isSingleSolution = function(){
		var size = that.st.size();
		var limit = size[1] -1;
		var costs = that.st.subset(math.index(0,[0,limit]));
		var variables = math.ones(limit);

		for(var i=0; i<that.variablesInBase.length; i++){
			var index = that.variablesInBase[i];
			variables.subset(math.index(index),0);
		}

		for(var i=0; i<limit; i++){
			if(variables.subset(math.index(i)) == 1){
				var value = costs.subset(math.index(0,i));
				if(value >= 0) return false;
			}
		}
		
		return true;
	};

	this.isInfinite = function(vIn){
		if(vIn == null) return false;
		var size = that.st.size();

		for(var i=0; i<that.variablesInBase.length; i++){
			var yr = that.st.subset(math.index(i+1,vIn));
			if(yr > 0){
				return false;
			}
		}
		return true;
	};

	this.isAllInfinite = function(){
		var size = that.st.size();
		for(var i=0; i<size[1]-1; i++){
			if($.inArray(i,that.variablesInBase) == -1){
				if(!that.isInfinite(i)) return false;
			}
		}
		return true;
	};

	this.getNextSolution = function(){
		if(that.firstSolution == null) return false;

		if(that.firstSolution.length == 0 && that.hasMoreSolutions()){
			that.firstSolution = that.getSolution();
			that.nextTable();
			return true;
		}

		if(!that.hasMoreSolutions()) return false;

		if(!that.currentIsEqualToFirstSolution()){
			that.nextTable();
			return true;
		}
		else{
			return false;
		}
	};

	this.getTypeOfSolution = function(){
		if(that.isGreatTable()){
			if(that.isAllInfinite()) return "infinite_solutions";

			if(that.isSingleSolution()) return "single";

			vIn = that.variableToInBase();			
			if(that.variableToOutBase(vIn) != null) return "multiple_solutions";

			return "error";
		}
		else{
			vIn = that.variableToInBase();
			if(that.isInfinite(vIn)) return "unlimited";
		}

		return "not_solution";
	};

	this.stopSecondFase = function(){
		if(that.getTypeOfSolution() == "not_solution") return false;
		else return true;
	};

	this.clone = function(){
		var newSt = new SimplexTable(that.lpp);
		newSt.variablesInBase = that.variablesInBase.slice();
		newSt.slackVariables = that.slackVariables.slice();
		newSt.virtualVariables = that.virtualVariables.slice();
		newSt.st = that.st.clone();
		if(that.firstSolution != null) newSt.firstSolution = that.firstSolution.slice();

		return newSt;
	};
}

function Simplex(lpp){
	this.lpp = lpp; 
	this.solution = null;
	this.currentStep = null;
	this.step = 0;
	this.stepSolution = 1;
	this.greatBase = null;
	var that = this;

	this.calculateSimplex2Fases = function(){
		var table = new SimplexTable(that.lpp);
		table.transformFromLPPToSimplexTable();
		if(table.isImpossibleLPP()) return false;

		while(table.hasVirtualVariableOnBase()){
			if(!table.nextTable()) return false;
			if(table.isImpossibleLPP()) return false;
		}
		table.removeVirtualVariables();
		that.greatBase = table.clone();
		while(!table.stopSecondFase()){
			if(!table.nextTable()) return false;
		}
		that.solution = table;
		return true;
	};

	this.getGreatBase = function(){
		return that.greatBase;
	};

	this.nextStepFirstFase = function(){
		if(that.currentStep == null){
			that.currentStep = new SimplexTable(that.lpp);
			that.currentStep.transformFromLPPToSimplexTable();
			that.step++;
			return that.currentStep;
		}

		if(that.currentStep.hasVirtualVariableOnBase()){
			if(that.currentStep.isImpossibleLPP()){
				that.currentStep = null;
				that.step = 0;
				return null;
			}
			that.currentStep.nextTable();
			that.step++;
			return that.currentStep;
		}
		else{
			return null;
		}
	};

	this.nextStepSecondFase = function(){
		if(that.currentStep == null) return null;
		if(that.currentStep.hasVirtualVariableOnBase()) return null;		

		if(that.currentStep.hasVirtualVariableOnTable()){
			that.currentStep.removeVirtualVariables();
			that.step++;
			return that.currentStep;
		}

		if(that.currentStep.stopSecondFase()) return null;
		else{
			that.currentStep.nextTable();
			that.step++;
			return that.currentStep;
		}
	};

	this.getStepSolution = function(){
		return this.stepSolution;
	};

	this.nextSolution = function(){
		if(that.solution == null) return null;

		if(that.solution.getNextSolution()){
			this.stepSolution++;
			return that.solution;
		}
		else return null;
	};

	this.resetStepByStep = function(){
		that.currentStep = null;
		that.step = 0;
	};

	this.getSolution = function(){
		return that.solution;
	};

	this.getStep = function(){
		return that.step;
	};
}
    
