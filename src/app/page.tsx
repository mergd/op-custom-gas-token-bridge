'use client'
import { useState, useEffect } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import TooltipComponent from '@/components/TooltipComponent'
import { Button } from '@/components/ui/button'
import { Info } from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { erc20Abi, zeroAddress, parseEther, formatEther, type Address } from 'viem'

export default function Home() {
  const { address: _userAddress, chain } = useAccount()
  const userAddress = _userAddress ?? zeroAddress

  const [tokenAddress, setTokenAddress] = useState('')
  const [portalProxyAddress, setPortalProxyAddress] = useState('')
  const [amount, setAmount] = useState('')
  const [tokenSymbol, setTokenSymbol] = useState('')
  const [formattedBalance, setFormattedBalance] = useState('')

  const { data: tokenBalance, refetch: refetchBalance } = useReadContract({
    abi: erc20Abi,
    address: tokenAddress as Address,
    functionName: 'balanceOf',
    args: [userAddress],
  })

  const { data: tokenSymbolData } = useReadContract({
    abi: erc20Abi,
    address: tokenAddress as Address,
    functionName: 'symbol',
  })

  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    abi: erc20Abi,
    address: tokenAddress as Address,
    functionName: 'allowance',
    args: [userAddress, portalProxyAddress as Address],
  })

  const { writeContract: approveToken, data: approveData } = useWriteContract()
  const { writeContract: depositERC20, data: depositData } = useWriteContract()
  const {
    data: receipt,
    isSuccess: isDepositSuccess,
    isLoading: isDepositing,
  } = useWaitForTransactionReceipt({
    hash: depositData,
  })

  const {
    data: approveReceipt,
    isSuccess: isApproveSuccess,
    isLoading: isApproving,
  } = useWaitForTransactionReceipt({
    hash: approveData,
  })
  console.log('allowance', allowance)
  console.log('tokenBalance', tokenBalance)

  useEffect(() => {
    if (tokenSymbolData) setTokenSymbol(tokenSymbolData as string)
  }, [tokenSymbolData])

  useEffect(() => {
    if (tokenBalance) {
      setFormattedBalance(formatEther(tokenBalance as bigint))
    }
  }, [tokenBalance])

  useEffect(() => {
    if (tokenAddress && portalProxyAddress && amount) {
      refetchAllowance()
    }
  }, [tokenAddress, portalProxyAddress, amount, refetchAllowance])

  const handleApprove = async () => {
    if (!tokenAddress || !portalProxyAddress || !amount) return
    const amountBigInt = parseEther(amount)
    await approveToken({
      address: tokenAddress as Address,
      abi: erc20Abi,
      functionName: 'approve',
      args: [portalProxyAddress as Address, amountBigInt],
    })
    await refetchBalance()
    await refetchAllowance()
  }

  const handleDeposit = async () => {
    if (!userAddress || !portalProxyAddress || !amount) return
    const amountBigInt = parseEther(amount)
    await depositERC20({
      address: portalProxyAddress as Address,
      abi: [
        {
          name: 'depositERC20Transaction',
          type: 'function',
          inputs: [
            { name: '_to', type: 'address' },
            { name: '_mint', type: 'uint256' },
            { name: '_value', type: 'uint256' },
            { name: '_gasLimit', type: 'uint64' },
            { name: '_isCreation', type: 'bool' },
            { name: '_data', type: 'bytes' },
          ],
          outputs: [],
          stateMutability: 'nonpayable',
        },
      ],
      functionName: 'depositERC20Transaction',
      args: [
        userAddress,
        amountBigInt,
        amountBigInt,
        BigInt(100000),
        false,
        '0x00000000000000000000000000000000000000000000000000000000000000c0000000000000000000000000000000000000000000000000000000000000000b7375706572627269646765000000000000000000000000000000000000000000',
      ],
    })
  }

  const isFormValid = tokenAddress && portalProxyAddress && amount && parseFloat(amount) > 0

  const BridgeForm = () => (
    <div className='mx-auto max-w-md space-y-4'>
      <div className='text-sm text-gray-600'>
        Network: <span className='font-semibold'>{chain?.name}</span>
      </div>
      <div>
        <Label htmlFor='tokenAddress' className='text-sm font-medium'>
          Token Address
        </Label>
        <Input
          id='tokenAddress'
          placeholder='0x...'
          value={tokenAddress}
          onChange={(e) => setTokenAddress(e.target.value)}
          className='mt-1'
        />
      </div>
      <div>
        <Label htmlFor='portalProxy' className='flex w-full items-center justify-between text-sm font-medium'>
          OptimismPortalProxy Address
          <TooltipComponent tooltipText='If you are on Conduit, find this value in the contracts.json file in your dashboard'>
            <Info className='ml-h-4 w-4 text-gray-400' />
          </TooltipComponent>
        </Label>
        <Input
          id='portalProxy'
          placeholder='0x...'
          value={portalProxyAddress}
          onChange={(e) => setPortalProxyAddress(e.target.value)}
          className='mt-1'
        />
      </div>
      {formattedBalance && (
        <div className='text-sm text-gray-600'>
          Balance:{' '}
          <span className='font-semibold'>
            {formattedBalance} {tokenSymbol}
          </span>
        </div>
      )}
      <div>
        <Label htmlFor='amount' className='text-sm font-medium'>
          Amount to Bridge
        </Label>
        <Input
          id='amount'
          placeholder='0.0'
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className='mt-1'
        />
      </div>
      {parseEther(amount ?? '0') > (allowance as bigint) ? (
        <Button onClick={handleApprove} disabled={!isFormValid || isApproving} className='w-full'>
          {isApproving ? 'Approving...' : 'Approve'}
        </Button>
      ) : (
        <Button onClick={handleDeposit} disabled={!isFormValid || isDepositing} className='w-full'>
          {isDepositing ? 'Depositing...' : 'Deposit'}
        </Button>
      )}
    </div>
  )

  return (
    <div className='container mx-auto px-4 py-8'>
      <h2 className='mb-6 text-center text-2xl font-bold'>Bridge Custom Gas Tokens</h2>
      <div className='mb-8 text-center text-sm text-gray-600'>
        <h3 className='mb-2 font-semibold'>Steps to Bridge:</h3>
        <ol className='list-inside list-decimal text-left text-sm'>
          <li>Enter the token address you wish to bridge</li>
          <li>Enter the OptimismPortalProxy contract address</li>
          <li>Enter the amount you want to bridge</li>
          <li>Approve the token spend (if needed)</li>
          <li>Confirm the deposit transaction</li>
        </ol>
      </div>
      {userAddress ? <BridgeForm /> : <div className='text-center'>Connect your wallet first!</div>}
    </div>
  )
}
