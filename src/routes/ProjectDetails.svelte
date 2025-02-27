<script lang="ts">
    import { type Project, is_ended, min_raised } from "$lib/common/project";
    import { address, connected, project_detail, project_token_amount, temporal_token_amount } from "$lib/common/store";
    import { Button, Progress, Badge } from "spaper";
    import { block_to_time } from "$lib/common/countdown";
    import { ErgoPlatform } from "$lib/ergo/platform";
    import { web_explorer_uri_tx } from '$lib/ergo/envs';

    // Define 'project' as a prop of type Project
    let project: Project = $project_detail;

    let platform = new ErgoPlatform();

    let transactionId: string | null = null;
    let errorMessage: string | null = null;
    let isSubmitting: boolean = false;

    let showCopyMessage = false;

    let currentVal = project.sold_counter;
    let min = project.minimum_amount;
    let max = project.total_pft_amount;
    let percentage =  parseInt(((currentVal/max)*100).toString())
    let typeProgress = 'secondary';
    if(currentVal < min) {
        typeProgress = 'danger'; 
    } else if(currentVal >= max) {
        typeProgress = 'success';
    }

    // States for amounts
    let show_submit = false;
    let label_submit = "";
    let function_submit = null;
    let value_submit = 0;
    let submit_info = "";
    let hide_submit_info = false;
    let submit_amount_label = "";

    $: submit_info = Number(value_submit * project.exchange_rate * Math.pow(10, project.token_details.decimals - 9)).toFixed(10).replace(/\.?0+$/, '') + "ERGs in total."

    // Project owner actions
    function setupAddTokens() {
        label_submit = "How many tokens do you want to add?";
        function_submit = add_tokens;
        value_submit = 0;
        show_submit = true;
        hide_submit_info = false;
        submit_amount_label = project.token_details.name
    }

    async function add_tokens() {
        console.log("Adding tokens:", value_submit);
        isSubmitting = true;

        try {
            const result = await platform.rebalance(project, value_submit);
            transactionId = result;
        } catch (error) {
            errorMessage = error.message || "Error occurred while adding tokens";
        } finally {
            isSubmitting = false;
        }
    }

    function setupWithdrawTokens() {
        label_submit = "How many tokens do you want to withdraw?";
        function_submit = withdraw_tokens;
        value_submit = 0;
        show_submit = true;
        hide_submit_info = false;
        submit_amount_label = project.token_details.name
    }

    async function withdraw_tokens() {
        console.log("Withdrawing tokens:", value_submit);
        isSubmitting = true;

        try {
            const result = await platform.rebalance(project, (-1) * value_submit);
            transactionId = result;
        } catch (error) {
            console.log(error)
            errorMessage = error.message || "Error occurred while withdrawing tokens";
        } finally {
            isSubmitting = false;
        }
    }

    function setupWithdrawErg() {
        label_submit = "How many ERGs do you want to withdraw?";
        function_submit = withdraw_erg;
        value_submit = 0;
        show_submit = true;
        hide_submit_info = true;
        submit_amount_label = "ERGs";
    }

    async function withdraw_erg() {
        console.log("Withdrawing ERGs:", value_submit);
        isSubmitting = true;

        try {
            const result = await platform.withdraw(project, value_submit);
            transactionId = result;
        } catch (error) {
            errorMessage = error.message || "Error occurred while withdrawing ERGs";
        } finally {
            isSubmitting = false;
        }
    }

    // User actions
    function setupBuy() {
        label_submit = "With how many tokens do you want to contribute?";
        function_submit = buy;
        value_submit = 0;
        show_submit = true;
        hide_submit_info = false;
        submit_amount_label = project.token_details.name
    }

    async function buy() {
        console.log("Buying tokens:", value_submit);
        isSubmitting = true;

        try {
            const result = await platform.buy_refund(project, value_submit);
            transactionId = result;
        } catch (error) {
            errorMessage = error.message || "Error occurred while buying tokens";
        } finally {
            isSubmitting = false;
        }
    }

    function setupRefund() {
        label_submit = "How many tokens do you want to refund?";
        function_submit = refund;
        value_submit = 0;
        show_submit = true;
        hide_submit_info = false;
        submit_amount_label = project.token_details.name
    }

    async function refund() {
        console.log("Refunding tokens:", value_submit);
        isSubmitting = true;

        try {
            const result = await platform.buy_refund(project, (-1) * value_submit);
            transactionId = result;
        } catch (error) {
            errorMessage = error.message || "Error occurred while refunding tokens";
        } finally {
            isSubmitting = false;
        }
    }

    function setupTempExchange() {
        label_submit = "Exchange "+project.content.title+" APT per "+project.token_details.name;
        function_submit = temp_exchange;
        value_submit = 0;
        show_submit = true;
        hide_submit_info = true;
        submit_amount_label = project.token_details.name
    }

    async function temp_exchange() {
        console.log("Refunding tokens:", value_submit);
        isSubmitting = true;

        try {
            const result = await platform.temp_exchange(project, value_submit);
            transactionId = result;
        } catch (error) {
            errorMessage = error.message || "Error occurred while exchange TFT <-> PFT";
        } finally {
            isSubmitting = false;
        }
    }

    // Function to handle sharing the project
    function shareProject() {
        navigator.clipboard.writeText(window.location.href)
            .then(() => {
                showCopyMessage = true;
                setTimeout(() => {
                    showCopyMessage = false;
                }, 2000);
            })
            .catch(err => console.error('Failed to copy text: ', err));
    }

    // Function to close the detail page
    function closePage() {
        targetDate = 0;
        clearInterval(countdownInterval);
        project_detail.set(null);
        temporal_token_amount.set(null);
        project_token_amount.set(null);
    }

    function close_submit_form() {
        show_submit = false;
        transactionId = null;
        errorMessage = null;
        isSubmitting = false;
    }

    let deadline_passed = false;
    let is_min_raised = false;
    let limit_date = "";
    async function load() {
        deadline_passed = await is_ended(project);
        is_min_raised = await min_raised(project);

        deadline_passed = await is_ended(project);
        is_min_raised = await min_raised(project)
        limit_date = new Date(await block_to_time(project.block_limit, project.platform)).toLocaleString();
    }
    load();

    let is_owner = false;
    async function checkIfIsOwner() {
        is_owner = $connected && await $address === project.constants.owner;
    }
    checkIfIsOwner();

    let targetDate = 0;
    async function setTargetDate() {
        targetDate = await block_to_time(project.block_limit, project.platform);
    }
    setTargetDate()

    function updateCountdown() {
        var currentDate = new Date().getTime();
        var diff = targetDate - currentDate;

        if (diff > 0) {
            var days = Math.floor(diff / (1000 * 60 * 60 * 24));
            var hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            var minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            var seconds = Math.floor((diff % (1000 * 60)) / 1000);
        } 
        else {
            var days = 0;
            var hours = 0
            var minutes = 0;
            var seconds = 0;
        }

        const daysElement = document.getElementById('days');
        const hoursElement = document.getElementById('hours');
        const minutesElement = document.getElementById('minutes');
        const secondsElement = document.getElementById('seconds');

        if (daysElement) {
            daysElement.innerHTML = days.toString();
        }
        if (hoursElement) {
            hoursElement.innerHTML = hours.toString();
        }
        if (minutesElement) {
            minutesElement.innerHTML = minutes.toString();
        }
        if (secondsElement) {
            secondsElement.innerHTML = seconds.toString();
        }
    }

    var countdownInterval = setInterval(updateCountdown, 1000);

    async function get_user_project_tokens(){
        var user_project_tokens = (await platform.get_balance(project.token_id)).get(project.token_id) ?? 0;
        project_token_amount.set((user_project_tokens/Math.pow(10, project.token_details.decimals)).toString()+" "+project.token_details.name);
        
        var temporal_tokens = (await platform.get_balance(project.project_id)).get(project.project_id) ?? 0;
        temporal_token_amount.set(temporal_tokens/Math.pow(10, project.token_details.decimals))
    }
    get_user_project_tokens()

</script>

<div class="back">
    <Button style="background-color: #FFB347; color: black; border: none; padding: 0.25rem 1rem; font-size: 1rem;" on:click={closePage}>
        &lt; Go to main
    </Button>
</div>

<!-- Main Project Detail Page -->
<div class="project-detail">
    <div class="details">

        <!-- =============================== -->
        <!-- Project Description Section -->
        <!-- =============================== -->
        <p><em style="font-size: 1.2em; font-weight: bold;">Description</em></p>
        <p>{project.content.description}</p>
        {#if project.content.link !== null}
            <p>More info <a href="{project.content.link}" target="_blank" rel="noopener noreferrer">here</a>.</p>
        {/if}

        <!-- =============================== -->
        <!-- Key Project Details Section -->
        <!-- =============================== -->
        <p><em style="font-size: 1.2em; font-weight: bold;">Details</em></p>
        <p><strong>Exchange Rate:</strong> {(project.exchange_rate * Math.pow(10, project.token_details.decimals - 9)).toFixed(10).replace(/\.?0+$/, '')} {platform.main_token}/{project.token_details.name}</p>
        <p><strong>Current ERG balance:</strong> {project.current_value / Math.pow(10, 9)} {platform.main_token}</p>
        <p><strong>Token:</strong> {project.token_id.slice(0, 6) + '...' + project.token_id.slice(-4)}</p>
        <p><strong>Deadline Date:</strong> {limit_date}</p>
        <p><strong>Deadline Block:</strong> {project.block_limit}</p>

        <!-- =============================== -->
        <!-- Additional Comments Section -->
        <!-- =============================== -->
        <!-- <p><em style="font-size: 1.2em; font-weight: bold;">Additional Comments</em></p> -->
         <!---<p><strong>Tokens refunded:</strong> {project.refunded_amount / Math.pow(10, project.token_details.decimals)} {project.token_details.name}</p>-->
        <!-- <p><strong>ERGs collected (included refunded or withdrawn):</strong> {project.collected_value / 1000000000} ERG</p> -->
        <!-- <p><strong>Owner:</strong> {project.constants.owner.slice(0, 6)}...{project.constants.owner.slice(-4)}</p> -->

        <Button style="background-color: gray; color: black; border: none; margin-top: 2rem;" on:click={shareProject}>
            Share
        </Button>
        {#if showCopyMessage}
            <div class="copy-msg" style="margin-top: 1rem;">
                Project page url copied to clipboard!
            </div>
        {/if}
    </div>

    <div class="extra">
        <div class="timeleft">
            <span class="timeleft-label">TIME LEFT</span>
            <div class="responsive1">
                <div class="item">
                    <div id="days"></div>
                    <div class="h3"><h3>Days</h3></div>
                </div>
                <div class="item">
                    <div id="hours"></div>
                    <div class="h3"><h3>Hours</h3></div>
                </div>
                <div class="item">
                    <div id="minutes"></div>
                    <div class="h3"><h3>Minutes</h3></div>
                </div>
                <div class="item">
                    <div id="seconds"></div>
                    <div class="h3"><h3>Seconds</h3></div>
                </div>
            </div>
        </div>
        <div class="progress">
            {#if project.sold_counter !== project.total_pft_amount}
                <Progress value="{percentage}" type="{typeProgress}" style="color: black;" />
            {:else}
                <Progress infinite type="primary" />
            {/if}
        </div>
        
        <div style="display: flex; justify-content: space-between; color: white;">
            <div>
                <div style="flex: 1; text-align: left;">Minimum Amount: {min / Math.pow(10, project.token_details.decimals)} {project.token_details.name}</div>
                <div style="flex: 1; text-align: right;">{((min * project.exchange_rate) / Math.pow(10, 9))} {platform.main_token}</div>
            </div>
            <div>
                <div style="flex: 1; text-align: left;">Current Amount Sold: {currentVal / Math.pow(10, project.token_details.decimals)} {project.token_details.name}</div>
                <div style="flex: 1; text-align: right;">{((currentVal * project.exchange_rate) / Math.pow(10, 9))} {platform.main_token}</div>
            </div>
            <div>
                <div style="flex: 1; text-align: left;">Maximum Amount: {max / Math.pow(10, project.token_details.decimals)} {project.token_details.name}</div>
                <div style="flex: 1; text-align: right;">{((max * project.exchange_rate) / Math.pow(10, 9))} {platform.main_token}</div>
            </div>
        </div>

        <!-- Action Buttons -->
        <div class="actions">

            <!-- User actions -->
            {#if $connected}
                <div class="action-group">
                    <div class="action-buttons">
                        <Button style="background-color: orange; color: black; border: none; margin-right: 3rem;" on:click={setupBuy} disabled={!(project.total_pft_amount !== project.sold_counter)}>
                            Contribute
                        </Button>
                        <Button style="background-color: orange; color: black; border: none;" on:click={setupRefund} disabled={!(deadline_passed && !is_min_raised)}>
                            Get a Refund
                        </Button>
                        <Button style="background-color: orange; color: black; border: none;" on:click={setupTempExchange} disabled={!(is_min_raised)}>
                            Collect {project.token_details.name}
                        </Button>
                    </div>
                </div>
            {/if}

            <!-- Project owner actions -->
            {#if is_owner}
                <div class="action-group">
                    <div class="action-buttons">
                        <Button style="background-color: orange; color: black; border: none;" on:click={setupAddTokens}>
                            Add {project.token_details.name}
                        </Button>
                        <Button style="background-color: orange; color: black; border: none;" on:click={setupWithdrawTokens}>
                            Withdraw {project.token_details.name}
                        </Button>
  
                        <Button style="background-color: orange; color: black; border: none; margin-left: 3rem;" on:click={setupWithdrawErg} disabled={!is_min_raised}>
                            Collect {platform.main_token}
                        </Button>
                    </div>
                </div>
            {/if}

        </div>

        <!-- Input field and submit button for actions -->
        {#if show_submit}
            <!-- svelte-ignore a11y-click-events-have-key-events -->
            <div class="actions-form">
                <!-- svelte-ignore a11y-click-events-have-key-events -->
                <!-- svelte-ignore a11y-no-static-element-interactions -->
                <div class="close-button" on:click={close_submit_form}>
                    &times;
                </div>
                <div class="centered-form">
                    {#if transactionId}
                        <div class="result">
                            <p>
                                <strong>Transaction ID:</strong>
                                <a href="{web_explorer_uri_tx + transactionId}" target="_blank" rel="noopener noreferrer" style="color: #ffa500;">
                                    {transactionId.slice(0,16)}
                                </a>
                            </p>
                        </div>
                    {:else if errorMessage}
                        <div class="error">
                            <p>{errorMessage}</p>
                        </div>
                    {:else}
                        <!-- svelte-ignore a11y-label-has-associated-control -->
                        <label>{label_submit}</label>
                        <div style="display: flex; align-items: center;">
                            <input
                                type="number"
                                bind:value={value_submit}
                                min="0"
                                step="1"
                                style="margin-left: 5px;"
                            />
                            <span style="margin-left: 15px;">{submit_amount_label}</span>
                        </div>
                        {#if ! hide_submit_info}
                            <Badge type="primary" rounded>{submit_info}</Badge>
                        {/if}
                        <Button on:click={function_submit} disabled={isSubmitting} style="background-color: orange; color: black; border: none; padding: 0.25rem 1rem; font-size: 1rem;">
                            {isSubmitting ? 'Submitting...' : 'Submit'}
                        </Button>  
                    {/if}
                </div>
            </div>
        {/if}

    </div>
</div>

<style>

    .result {
        margin-top: 1rem;
    }

    .error {
        color: red;
    }

    .copy-msg {
        color: #28a745;
    }

    .back {
        margin-top: 15px;
        margin-left: 3.5rem;
        margin-bottom: 0rem;
    }

    .project-detail {
        margin-left: 2rem;
        padding: 1.5rem;
        border-radius: 8px;
        color: #ddd;
        display: flex;
        flex-direction: row;
        gap: 2rem;
        height: 85vh;
    }

    .details {
        width: 30vw;
        margin-bottom: 1.5rem;
        flex-direction: column;
        overflow-y: scroll;
        overflow-x: hidden;
        scrollbar-color: rgba(255, 255, 255, 0) rgba(0, 0, 0, 0);
    }

    .extra {
        width: 50vw;
        display: flex;
        flex-direction: column;
        overflow-y: scroll;
        overflow-x: hidden;
        scrollbar-color: rgba(255, 255, 255, 0) rgba(0, 0, 0, 0);
    }

    .actions {
        margin-top: 2rem;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 0.5rem;
    }

    .action-group {
        padding: 0.1rem;
        flex: 1;
    }

    .action-buttons {
        display: flex;
        flex-wrap: wrap;
        gap: 0.5rem;
        margin-top: 0.25rem;
    }

    .action-buttons :global(button) {
        padding: 0.25rem 1rem;
        font-size: 1rem;
    }

    .actions-form {
        position: relative;
        margin-top: 1rem;
        padding: 1rem;
        background: rgba(255, 255, 255, 0.05);
        border-radius: 16px;
        display: flex;
        justify-content: center;
        align-items: center;
    }

    .close-button {
        position: absolute;
        top: 10px;
        right: 15px;
        background-color: transparent;
        border: none;
        font-size: 24px;
        color: rgb(255, 255, 255);
        cursor: pointer;
    }

    .centered-form {
        width: 100%;
        max-width: 500px;
        display: flex;
        align-items: center;
        flex-direction: column;
        gap: 1rem;
    }

    .timeleft {
        margin-bottom: 2rem;
        display: flex;
        flex-direction: column;
        align-items: center;
    }

    .timeleft-label {
        font-size: 30px;
        text-align: center;
        margin-bottom: 1rem;
    }

    .timeleft > span {
        font-size: 30px;
    }

    .progress {
        margin-bottom: 1rem;
        min-height: 1rem;
    }

    .item {
        width: 100px;
        height: 100px;
        padding: 10px 0px 5px 0px;
        text-align: center;
        display: inline-block;
        margin: 5px;
        border: 3px solid #ddd;
        border-radius: 5px;
    }

    .item > div {
        font-size: 40px;
        animation: fade 3s;
        line-height: 30px;
        margin-top: 5px;
    }

    .item > div > h3 {
        margin-top: 15px;
        font-size: 20px;
        font-weight: normal;
    }
</style>