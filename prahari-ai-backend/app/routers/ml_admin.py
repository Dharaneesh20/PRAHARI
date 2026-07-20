import os
import subprocess
import logging
from app.models.user import User
from fastapi import APIRouter, Depends, BackgroundTasks

from app.dependencies import require_level_3
from app.config import settings

router = APIRouter()
logger = logging.getLogger(__name__)

# Track pipeline status
PIPELINE_STATUS = {
    "is_running": False,
    "current_step": "",
    "logs": []
}

def run_pipeline_task():
    global PIPELINE_STATUS
    PIPELINE_STATUS["is_running"] = True
    PIPELINE_STATUS["logs"] = ["Pipeline started."]
    
    pipeline_dir = os.path.join(os.path.dirname(settings.ml_pipeline_path_absolute), "pipeline")
    
    scripts = [
        "step1_geo_imputation.py",
        "step2_lookup_tables.py",
        "step2b_case_master.py",
        "step3_pii_synthesis.py",
        "step4_feature_engineering.py",
        "step5_nl2sql_agent.py",
        "step6_trend_hotspot_module.py",
        "step7_test_suite.py"
    ]
    
    try:
        for script in scripts:
            script_path = os.path.join(pipeline_dir, script)
            if not os.path.exists(script_path):
                msg = f"Skipping {script}: File not found."
                logger.warning(msg)
                PIPELINE_STATUS["logs"].append(msg)
                continue
                
            msg = f"Running {script}..."
            logger.info(msg)
            PIPELINE_STATUS["current_step"] = script
            PIPELINE_STATUS["logs"].append(msg)
            
            # Using current python executable
            import sys
            result = subprocess.run([sys.executable, script_path], cwd=pipeline_dir, capture_output=True, text=True)
            
            if result.returncode != 0:
                err_msg = f"Error in {script}:\n{result.stderr}"
                logger.error(err_msg)
                PIPELINE_STATUS["logs"].append(err_msg)
                PIPELINE_STATUS["is_running"] = False
                return
            else:
                PIPELINE_STATUS["logs"].append(f"Successfully completed {script}")
                
        PIPELINE_STATUS["logs"].append("Pipeline finished successfully.")
    except Exception as e:
        logger.error(f"Pipeline failed: {e}")
        PIPELINE_STATUS["logs"].append(f"Pipeline failed: {e}")
    finally:
        PIPELINE_STATUS["is_running"] = False
        PIPELINE_STATUS["current_step"] = ""

@router.post("/run-pipeline", summary="Trigger ML Pipeline")
async def trigger_pipeline(background_tasks: BackgroundTasks, current_user: User = Depends(require_level_3)):
    if PIPELINE_STATUS["is_running"]:
        return {"status": "already_running", "message": "Pipeline is already running."}
        
    background_tasks.add_task(run_pipeline_task)
    return {"status": "started", "message": "ML Pipeline started in the background."}

@router.get("/pipeline-status", summary="Get Pipeline Status")
async def get_pipeline_status(current_user: User = Depends(require_level_3)):
    return PIPELINE_STATUS
