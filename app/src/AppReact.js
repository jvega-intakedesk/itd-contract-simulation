// src/App.js
import React, {
    useCallback,
    useMemo,
    useRef,
    useState,
    StrictMode,
    useEffect,
} from "react";

import AddContractButton from "./components/AddContractButton"
import { AgGridReact } from "@ag-grid-community/react";
import "@ag-grid-community/styles/ag-grid.css";
import "@ag-grid-community/styles/ag-theme-quartz.css";
import "./styles.css";
import { ClientSideRowModelModule } from "@ag-grid-community/client-side-row-model";
import {
    ColDef,
    ColGroupDef,
    GridApi,
    GridOptions,
    ModuleRegistry,
    ValueGetterParams,
    createGrid,
} from "@ag-grid-community/core";
ModuleRegistry.registerModules([ClientSideRowModelModule]);


import ProgressBar from './components/ProgressBar';

let numberOfDays = 0;
let assignedIntakes = [];

const formatNumber = (number) => {
    return Math.floor(number).toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    })
};

function sortBycasesToFulfillDesc(params) {
    params.api.applyColumnState({
        state: [{ colId: "casesToFulfill", sort: "desc" }],
        defaultState: { sort: null },
    });
}

const AppReact = () => {
    const [contracts, setContracts] = useState([]);
    const [progress, setProgress] = useState(100);
    const containerStyle = useMemo(() => ({ width: "98%", height: "500px" }), []);
    const gridStyle = useMemo(() => ({ height: "100%", width: "100%" }), []);

    const randNumGenerator = () => (Math.floor(Math.random() * 5) + 1) * 10000;

    const onGridReady = useCallback((params) => {
        
        const updateDaysLeftValues = () => {
            params.api.forEachNode((rowNode, index) => {
                rowNode.setDataValue('daysLeft', rowNode.data.daysLeft - 1);
            });
            numberOfDays++;

            recalculateValues();
        };
        setInterval(updateDaysLeftValues, 60000);

        const updateIntakesValues = () => {
            setTimeout(() => {
                var row = 0;
                var rowNode = params.api.getDisplayedRowAtIndex(row);

                // console.log('rowNode', rowNode);
                
                assignedIntakes.push({
                    contractId : rowNode.data.id,
                    dayAdded: numberOfDays
                });

                rowNode.setDataValue('assignedIntakes', rowNode.data.assignedIntakes + 1);
                updateIntakesValues();
                recalculateValues();
            }, 1000);

        };
        updateIntakesValues();

        const updateConvertedCasesValues = () => {
            setTimeout(() => {


                // Step 1: Sort the assignedIntakes array by dayAdded DESC
                assignedIntakes.sort((a, b) => b.dayAdded - a.dayAdded);

                // Step 2: Get the first intake from the top
                let firstIntake = assignedIntakes[0];
                console.log('firstIntake', firstIntake);

                // Step 3: Calculate the number of days since the intake was added
                let daysSinceAdded = numberOfDays - firstIntake.dayAdded;

                // Step 4: Determine the probability of conversion
                let conversionProbability;

                if (daysSinceAdded <= 7) {
                    conversionProbability = .80;
                } else if (daysSinceAdded <= 21) {
                    conversionProbability = .40;
                } else {
                    conversionProbability = .05;
                }

                var rowCount = params.api.getDisplayedRowCount();
                
                //select the contract to apply logic
                var row = Math.floor(Math.random() * rowCount);

                var rowNode = params.api.getDisplayedRowAtIndex(row);
                rowNode = params.api.getRowNode(firstIntake.contractId);

                console.log('rowNode', rowNode);

                const randomNumber = Math.random();
                
                if (randomNumber < conversionProbability) {
                    // 20% chance
                    
                    if (rowNode.data.callables > 0) {
                        rowNode.setDataValue('convertedCases', rowNode.data.convertedCases + 1);
                    }
                    
                    console.log("Update Conversion --->" + row);

                } else {
                    // 80% chance
                    
                    if (rowNode.data.callables > 0) {
                        rowNode.setDataValue('doNotQualify', rowNode.data.doNotQualify + 1);
                    }
                    
                    console.log("Update Do Not QUality --->" + row);
                }

                
                assignedIntakes.shift();

                updateConvertedCasesValues();

                recalculateValues();
                

            }, 2500);
        };
        updateConvertedCasesValues();

        const recalculateValues = () => {


            params.api.forEachNode((rowNode, index) => {

                rowNode.setDataValue('casesToFulfill', ((rowNode.data.contractMin - rowNode.data.convertedCases) < 0) ? 0 : (rowNode.data.contractMin - rowNode.data.convertedCases)); //Cases To Fulfill

                const acd = parseFloat((((rowNode.data.contractDays - rowNode.data.daysLeft) < 1) ? 1 : rowNode.data.convertedCases / (rowNode.data.contractDays - rowNode.data.daysLeft)).toFixed(2)); //actual case/day
                rowNode.setDataValue('actualCasesPerDay', acd);

                const rcd = (rowNode.data.daysLeft < 1) ? 1 : (rowNode.data.casesToFulfill / rowNode.data.daysLeft); //required case/day
                const rcdf = parseFloat(rcd.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                }))
                rowNode.setDataValue('requiredCasesPerDay', rcdf);

                const csf = parseFloat((((rowNode.data.requiredCasesPerDay - rowNode.data.actualCasesPerDay) < 1) ? 1 : (rowNode.data.requiredCasesPerDay - rowNode.data.actualCasesPerDay)).toFixed(2)); //conversion shortfall
                //const csf = parseFloat((((rowNode.data.requiredCasesPerDay) < 1)? 0 : ((1 - (rowNode.data.actualCasesPerDay /rowNode.data.requiredCasesPerDay )) * 100) ).toFixed(2)); //conversion shortfall %
                rowNode.setDataValue('convShortfall', csf);

                const cci = parseFloat((rowNode.data.assignedIntakes - (rowNode.data.convertedCases + rowNode.data.doNotQualify)).toFixed(0)); //callable intakes
                rowNode.setDataValue('callables', cci);

                const ir = parseFloat(((rowNode.data.conversionRate < 1) ? rcdf : (rowNode.data.requiredCasesPerDay / (rowNode.data.conversionRate / 100))).toFixed(0)); //intakes required
                rowNode.setDataValue('intakeReq', ir);

            });

            var sum_intake_req = 0;
            params.api.forEachNode((rowNode, index) => {
                // console.log("Int Req -> " + rowNode.data.intakeReq); 
                sum_intake_req = sum_intake_req + parseFloat(rowNode.data.intakeReq);
            });
            console.log("sum_intake_req -------> " + sum_intake_req);

            params.api.forEachNode((rowNode, index) => {
                const idd = parseFloat(((sum_intake_req < 1) ? rowNode.data.intakeReq : (rowNode.data.intakeReq / sum_intake_req) * 100).toFixed(2)); //intakes required
                rowNode.setDataValue('intakeDistribution', idd);
            });

            params.api.forEachNode((rowNode, index) => {
                const dist = parseFloat(((sum_intake_req < 1) ? 0 : ((1 / rowNode.data.convShortfall) / ((1 + rowNode.data.intakeDistribution) * (rowNode.data.casesToFulfill / ((rowNode.data.callables < 1) ? 1 : rowNode.data.callables) / 100))) * 100).toFixed(2)); //intakes required
                rowNode.setDataValue('distributionDeficit', dist);
            });


            resetSort();
            sortByFF();

        };

        const resetSort = () => {
            params.api.applyColumnState({
                state: [{ colId: "id", sort: "asc" }],
                defaultState: { sort: null },
            });
        };

        const sortByFF = () => {
            params.api.applyColumnState({
                state: [{ colId: "distributionDeficit", sort: "asc" }],
                defaultState: { sort: null },
            });
        };


    }, []);

    const columnDefs = useMemo(() => [
        { field: 'id', headerName: 'ID', maxWidth: 50, resizable: true },
        { field: 'distributionDeficit', headerName: 'Deficit', maxWidth: 140, resizable: true, enableCellChangeFlash: true },
        { field: 'contractDays', headerName: 'Contract Days', maxWidth: 130, resizable: true, cellRenderer: "agAnimateShowChangeCellRenderer" },
        { field: 'contractMin', headerName: 'Contract Min', minWidth: 110, resizable: true, cellRenderer: "agAnimateShowChangeCellRenderer" },
        { field: 'daysLeft', headerName: 'Days Left', maxWidth: 110, resizable: true, cellRenderer: "agAnimateShowChangeCellRenderer" },
        { field: 'casesToFulfill', headerName: 'To Fulfill', width: 120, resizable: true, cellRenderer: "agAnimateShowChangeCellRenderer" },
        { field: 'assignedIntakes', headerName: 'Intakes', minWidth: 130, resizable: true, cellRenderer: "agAnimateShowChangeCellRenderer" },
        { field: 'callables', headerName: 'Callables', width: 120, resizable: true, cellRenderer: "agAnimateShowChangeCellRenderer" },
        { field: 'convertedCases', headerName: 'Converted', width: 120, resizable: true, cellRenderer: "agAnimateShowChangeCellRenderer" },
        { field: 'doNotQualify', headerName: 'DNQ', width: 120, resizable: true, cellRenderer: "agAnimateShowChangeCellRenderer" },
        { field: 'conversionRate', headerName: 'Conv. Rate %', width: 120, resizable: true, enableCellChangeFlash: true },
        { field: 'actualCasesPerDay', headerName: 'Actual Cases/Day', width: 120, resizable: true, enableCellChangeFlash: true },
        { field: 'requiredCasesPerDay', headerName: 'Req. Cases/Day', width: 120, resizable: true, enableCellChangeFlash: true },
        { field: 'convShortfall', headerName: 'Conv. Shortfall', width: 120, resizable: true, enableCellChangeFlash: true },
        { field: 'intakeReq', headerName: 'Intake Req.', width: 120, resizable: true, cellRenderer: "agAnimateShowChangeCellRenderer" },
        { field: 'intakeDistribution', headerName: 'Distribution %', maxWidth: 110, resizable: true, enableCellChangeFlash: true }
    ], []);

    const defaultColDef = useMemo(() => {
        return {
            flex: 1,
            cellClass: "align-right",
            wrapText: true,
            autoHeight: true,
        };
    }, []);

    useEffect(() => {
        // Initialize contracts
        setContracts([
            { id: 1, distributionDeficit: 0, contractDays: 90, contractMin: 300, daysLeft: 89, convertedCases: 0, doNotQualify: 0, casesToFulfill: 1, assignedIntakes: 0, callables: 0, conversionRate: 25, requiredCasesPerDay: 0, actualCasesPerDay: 0, convShortfall: 0, intakeReq: 0, intakeDistribution: 0 },
            { id: 2, distributionDeficit: 0, contractDays: 60, contractMin: 200, daysLeft: 59, convertedCases: 0, doNotQualify: 0, casesToFulfill: 1, assignedIntakes: 0, callables: 0, conversionRate: 25, requiredCasesPerDay: 0, actualCasesPerDay: 0, convShortfall: 0, intakeReq: 0, intakeDistribution: 0 },
            { id: 3, distributionDeficit: 0, contractDays: 90, contractMin: 300, daysLeft: 89, convertedCases: 0, doNotQualify: 0, casesToFulfill: 1, assignedIntakes: 0, callables: 0, conversionRate: 25, requiredCasesPerDay: 0, actualCasesPerDay: 0, convShortfall: 0, intakeReq: 0, intakeDistribution: 0 },
            { id: 4, distributionDeficit: 0, contractDays: 30, contractMin: 100, daysLeft: 29, convertedCases: 0, doNotQualify: 0, casesToFulfill: 1, assignedIntakes: 0, callables: 0, conversionRate: 25, requiredCasesPerDay: 0, actualCasesPerDay: 0, convShortfall: 0, intakeReq: 0, intakeDistribution: 0 },
            { id: 5, distributionDeficit: 0, contractDays: 45, contractMin: 150, daysLeft: 44, convertedCases: 0, doNotQualify: 0, casesToFulfill: 1, assignedIntakes: 0, callables: 0, conversionRate: 25, requiredCasesPerDay: 0, actualCasesPerDay: 0, convShortfall: 0, intakeReq: 0, intakeDistribution: 0 },
            { id: 6, distributionDeficit: 0, contractDays: 70, contractMin: 250, daysLeft: 69, convertedCases: 0, doNotQualify: 0, casesToFulfill: 1, assignedIntakes: 0, callables: 0, conversionRate: 25, requiredCasesPerDay: 0, actualCasesPerDay: 0, convShortfall: 0, intakeReq: 0, intakeDistribution: 0 },
            // Add more contracts as needed
        ]);

        const interval = setInterval(() => {
            setProgress(100);  // Reset progress bar every 10 seconds
        }, 60000);

        const progressInterval = setInterval(() => {
            setProgress(prevProgress => {
                if (prevProgress > 0) return prevProgress - 1.6;
                return 0;
            });
        }, 1000);

        return () => {
            clearInterval(interval);
            clearInterval(progressInterval);
        };
    }, []);


    const addSmallContract = useCallback(() => {
        console.log("New Contract Button");
        const newContract = contracts.slice();
        const newItem = { id: 0, distributionDeficit: 0, contractDays: 40, contractMin: 120, daysLeft: 0, convertedCases: 0, doNotQualify: 0, casesToFulfill: 1, assignedIntakes: 0, callables: 0, conversionRate: 25, requiredCasesPerDay: 0, actualCasesPerDay: 0, convShortfall: 0, intakeReq: 0, intakeDistribution: 0 };

        newItem.id = contracts.length + 1;
        newItem.daysLeft = newItem.contractDays - 1;

        newContract.push(newItem);
        //console.log(newContract);
        setContracts(newContract);
    }, [contracts]);

    const addBigContract = useCallback(() => {
        console.log("New Contract Button");
        const newContract = contracts.slice();
        const newItem = { id: 0, distributionDeficit: 0, contractDays: 86, contractMin: 260, daysLeft: 0, convertedCases: 0, doNotQualify: 0, casesToFulfill: 1, assignedIntakes: 0, callables: 0, conversionRate: 25, requiredCasesPerDay: 0, actualCasesPerDay: 0, convShortfall: 0, intakeReq: 0, intakeDistribution: 0 };

        newItem.id = contracts.length + 1;
        newItem.daysLeft = newItem.contractDays - 1;

        newContract.push(newItem);
        //console.log(newContract);
        setContracts(newContract);
    }, [contracts]);

    return (
        <div>
            <h1>Fulfillment Orders Simulator</h1>
            <br></br>
            <div>
                <AddContractButton
                    border="none"
                    color="grey"
                    height="20px"
                    onClick={addSmallContract}
                    width="200px"
                >Add 120 Contract</AddContractButton>

                <AddContractButton
                    border="none"
                    color="lightgrey"
                    height="20px"
                    onClick={addBigContract}
                    width="200px"
                >Add 260 Contract</AddContractButton>
            </div>
            <br></br>
            <h3>Day Progress</h3> <ProgressBar progress={progress} />
            <br></br>
            {/* <ContractTable contracts={contracts} /> */}
            <div style={containerStyle}>
                <div
                    style={gridStyle}
                    className={
                        "ag-theme-quartz"
                    }
                >
                    <AgGridReact
                        rowData={contracts}
                        columnDefs={columnDefs}
                        defaultColDef={defaultColDef}
                        onGridReady={onGridReady}
                    />
                </div>
            </div>

        </div>
    );
};

export default AppReact;
