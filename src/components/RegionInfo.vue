<script setup>
	defineProps(['regionId', 'regionAbbr', 'regionFullname'])
</script>
<template>
  <el-card class="box-card">
    <template #header>
			<div class="card-header">
				<span>Current Region</span>
			</div>
    </template>
    <div class="row item">
			<div class="label">ID:</div>
			<div class="content">{{regionId}}</div>
    </div>
    <div class="row item">
			<div class="label">Abbr:</div>
			<div class="content">{{regionAbbr}}</div>
    </div>
    <div class="row item high">
			<div class="label">FullName:</div>
			<div class="content" :title="regionFullname">{{regionFullname}}</div>
    </div>
  </el-card>
</template>
<style>
	.row {
		font-size: 20px;
		height: 24px;
		line-height: 24px;
		display: flex;
	}

	.row.high {
		height: 60px;
	}

	.row.high .content {
		white-space: normal;
	}

	.row .label {
		min-width: 120px;
		font-weight: 700;
	}

	.row .content {
		color: red;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}


	.card-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	.item {
		margin-bottom: 18px;
	}

	.box-card {
		position: absolute;
		width: 400px;
		right: 20px;
		top: 20px;
	}
</style>