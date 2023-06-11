(function(){
	var gm = new GraphicManager();
	var dm = new DataManager(gm);
	var firstLPP = new LPP();

	firstLPP.setFunction("min",[-1,-1]);
	firstLPP.createConstraint([3,2],'>',6);
	firstLPP.createConstraint([4,1],'<',16);
	firstLPP.createConstraint([-2,3],'<',6);
	firstLPP.createConstraint([1,4],'>',4);


	dm.putLPP(firstLPP);

	var firstFase = true;

	var simplex = null;



	var clearAll = function(){
		$('#great_base').empty();
		$('#solutions').empty();
		$('#steps').empty();
		simplex = null;
		firstFase = true;
		
		gm.removeAlertMessage("type_solution_msg");
		gm.removeAlertMessage("solve_msg");
		gm.removeAlertMessage("next_solution_msg");
		gm.removeAlertMessage("next_step_msg");
	};

	$("#add_column_btn").on('click',function(e){
		var lpp = dm.getLPP();
		gm.addColumn();
		dm.partialPutLPP(lpp);

	
	});
	$("#remove_column_btn").on('click',function(e){
		var lpp = dm.getLPP();
		gm.removeColumn();
		dm.partialPutLPP(lpp);

	});
	$("#add_line_btn").on('click',function(e){
		var lpp = dm.getLPP();
		gm.addLine();
		dm.partialPutLPP(lpp);
	
		
	});
	$("#remove_line_btn").on('click',function(e){
		var lpp = dm.getLPP();
		gm.removeLine();
		dm.partialPutLPP(lpp);

		
	});
	$("#calculate_simplex_btn").on('click',function(e){
		clearAll();

		if(gm.getNumberOfLines() == 0 || gm.getNumberOfColumns() == 0){
			gm.putAlertMessage("solve_msg","size_error","danger");
			
			return;
		}

		var lpp = dm.getLPP();
		dm.putLPP(lpp);
		firstFase = true;

		var sp = new Simplex(lpp);
		if(sp.calculateSimplex2Fases()){
			gm.putAlertMessage("solve_msg","problem_solved","success");
			gm.printTypeOfSolution("type_solution_msg", sp.getSolution().getTypeOfSolution());
			simplex = sp;
			dm.putSolution(sp.getSolution(),1);
			dm.putGreatBase(sp.getGreatBase());
		}
		else{
			gm.removeAlertMessage("type_solution_msg");
			gm.putAlertMessage("solve_msg","invalid_lpp","danger");
		}
		
	
	});

	$("#clear_solutions_btn").on('click',function(){
		clearAll();
	
	});

	$("#next_solution").on('click',function(){
		gm.removeAlertMessage("next_solution_msg");
		if(simplex == null){
			gm.putAlertMessage("next_solution_msg","first_press_button_solve_lpp","warning");
			
			$('#solutions').empty();
			return;
		}

		var result = simplex.nextSolution();
		if(result == null){
			gm.putAlertMessage("next_solution_msg","there_isnt_more_solutions","info");
	
			return;
		}
		dm.putSolution(result, simplex.getStepSolution());

		
	});

	$("#next_step").on('click',function(){
		gm.removeAlertMessage("next_step_msg");
		if(simplex == null){
			gm.putAlertMessage("next_step_msg","first_press_button_solve_lpp","warning");
			$('#steps').empty();
			firstFase = true;
			
			return;
		}

		var result = simplex.nextStepFirstFase();
		if(result == null){
			if(firstFase){
				gm.endOfFirstFaseMessage();				
				firstFase = false;
			}
			result = simplex.nextStepSecondFase();
		}
		if(result == null) gm.putAlertMessage("next_step_msg","end_of_steps","info");

		dm.putStep(result, simplex.getStep());
		
		
	});

	
})();
